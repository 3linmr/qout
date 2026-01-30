const { supabase } = require("../lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  const customerId = req.query.customerId;
  if (!customerId) {
    res.status(400).json({ message: "customerId is required." });
    return;
  }

  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", customerId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cartError) {
    res.status(500).json({ message: "Failed to load cart." });
    return;
  }

  if (!cart) {
    res.status(200).json({ cartId: null, items: [] });
    return;
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

