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

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  const body = parseBody(req);
  const customerId = body.customerId;
  const phone = String(body.phone || "").trim();
  const pickup = body.pickup || null;
  const items = Array.isArray(body.items) ? body.items : [];

  if (!customerId || items.length === 0) {
    res.status(400).json({ message: "Invalid order payload." });
    return;
  }

  const itemIds = [...new Set(items.map((item) => item.id))];
  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id,name,price")
    .in("id", itemIds);

  if (menuError) {
    res.status(500).json({ message: "Failed to validate items." });
    return;
  }

  const menuMap = new Map(menuItems.map((item) => [item.id, item]));
  const normalizedItems = items
    .map((item) => {
      const menuItem = menuMap.get(item.id);
      if (!menuItem) return null;
      const qty = Math.max(Number(item.qty) || 0, 0);
      return {
        id: menuItem.id,
        name: menuItem.name,
        price: Number(menuItem.price),
        qty,
      };
    })
    .filter((item) => item && item.qty > 0);

  if (normalizedItems.length === 0) {
    res.status(400).json({ message: "No valid items provided." });
    return;
  }

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      phone,
      pickup_type: pickup?.type || null,
      pickup_date: pickup?.date || null,
      pickup_time: pickup?.time || null,
      pickup_label: pickup?.label || null,
      subtotal,
      tax,
      total,
      status: "pending",
    })
    .select()
    .single();

  if (orderError) {
    res.status(500).json({ message: "Failed to create order." });
    return;
  }

  const orderItems = normalizedItems.map((item) => ({
    order_id: order.id,
    item_id: item.id,
    name: item.name,
    price: item.price,
    qty: item.qty,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    res.status(500).json({ message: "Failed to save order items." });
    return;
  }

  await supabase
    .from("carts")
    .update({ status: "submitted" })
    .eq("customer_id", customerId)
    .eq("status", "open");

  res.status(200).json({ order });
};

