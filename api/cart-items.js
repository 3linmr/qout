const { supabase } = require("../lib/supabase");

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return req.body;
};

const getOrCreateCart = async (customerId) => {
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", customerId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cart) return cart;

  const { data: newCart, error } = await supabase
    .from("carts")
    .insert({ customer_id: customerId, status: "open" })
    .select("id")
    .single();

  if (error) throw error;
  return newCart;
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  const body = parseBody(req);
  const customerId = body.customerId;
  const itemId = body.itemId;
  const delta = Number(body.delta || 0);
  const qtyOverride = body.qty !== undefined ? Number(body.qty) : null;

  if (!customerId || !itemId) {
    res.status(400).json({ message: "Invalid payload." });
    return;
  }

  let cart;
  try {
    cart = await getOrCreateCart(customerId);
  } catch (error) {
    res.status(500).json({ message: "Failed to create cart." });
    return;
  }

  const { data: menuItem, error: menuError } = await supabase
    .from("menu_items")
    .select("id,name,price")
    .eq("id", itemId)
    .single();

  if (menuError || !menuItem) {
    res.status(404).json({ message: "Menu item not found." });
    return;
  }

  const { data: existingItem } = await supabase
    .from("cart_items")
    .select("id,qty")
    .eq("cart_id", cart.id)
    .eq("item_id", itemId)
    .maybeSingle();

  const nextQty = qtyOverride !== null ? qtyOverride : (existingItem?.qty || 0) + delta;

  if (nextQty <= 0) {
    if (existingItem) {
      await supabase.from("cart_items").delete().eq("id", existingItem.id);
    }
  } else if (existingItem) {
    await supabase
      .from("cart_items")
      .update({ qty: nextQty, price: menuItem.price, name: menuItem.name })
      .eq("id", existingItem.id);
  } else {
    await supabase.from("cart_items").insert({
      cart_id: cart.id,
      item_id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      qty: nextQty,
    });
  }

  const { data: items, error: itemsError } = await supabase
    .from("cart_items")
    .select("item_id,name,price,qty")
    .eq("cart_id", cart.id);

  if (itemsError) {
    res.status(500).json({ message: "Failed to load cart items." });
    return;
  }

  res.status(200).json({
    cartId: cart.id,
    items: (items || []).map((item) => ({
      id: item.item_id,
      name: item.name,
      price: Number(item.price),
      qty: item.qty,
    })),
  });
};

