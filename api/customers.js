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
  const phone = String(body.phone || "").trim();
  if (!phone) {
    res.status(400).json({ message: "Phone is required." });
    return;
  }

  const { data, error } = await supabase
    .from("customers")
    .upsert({ phone }, { onConflict: "phone" })
    .select("id,phone,created_at")
    .single();

  if (error) {
    res.status(500).json({ message: "Failed to save customer." });
    return;
  }

  res.status(200).json({ customer: data });
};

