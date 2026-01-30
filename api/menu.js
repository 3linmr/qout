const { supabase } = require("../lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select("id,name,description,price,category")
    .eq("is_active", true)
    .order("category", { ascending: true });

  if (error) {
    res.status(500).json({ message: "Failed to load menu." });
    return;
  }

  const items = (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    desc: item.description,
    price: Number(item.price),
    category: item.category,
  }));

  res.status(200).json({ items });
};

