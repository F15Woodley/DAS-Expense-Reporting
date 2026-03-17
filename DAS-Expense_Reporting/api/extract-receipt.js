export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { fileBase64, mimeType, filename } = req.body || {};

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing file data" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const prompt = `
    You are an expert receipt parser.
    
    Extract structured data from this receipt and return ONLY valid JSON.
    
    Rules:
    - vendor: business name only, no address, no phone number, no extra text
    - date: transaction date in YYYY-MM-DD format
    - amount: final total paid, number only, no dollar sign
    - expenseType: must be exactly one of:
      Airfare, Hotel, Rental Car, Fuel, Meals, Parking / Tolls, Mileage, Ground Transport
    
    Important:
    - If multiple totals exist, use the final total actually paid
    - Do not return subtotal unless it is the only total shown
    - If a value is unclear, return an empty string
    - Return no explanation, no commentary, no markdown
    
    Return exactly this JSON shape:
    {
      "vendor": "",
      "date": "",
      "amount": "",
      "expenseType": ""
    }
    `;
    let content;

    if (mimeType === "application/pdf") {
      content = [
        {
          type: "input_file",
          filename: filename || "receipt.pdf",
          file_data: `data:application/pdf;base64,${fileBase64}`,
        },
        {
          type: "input_text",
          text: prompt,
        },
      ];
    } else {
      content = [
        {
          type: "input_text",
          text: prompt,
        },
        {
          type: "input_image",
          image_url: `data:${mimeType};base64,${fileBase64}`,
        },
      ];
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [
          {
            role: "user",
            content,
          },
        ],
      }),
    });

    const data = await response.json();

    const text =
      data.output_text ||
      data.output
        ?.map((o) => o.content?.map((c) => c.text || "").join(" "))
        .join(" ") ||
      "{}";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(200).json({
        vendor: "",
        date: "",
        amount: "",
        expenseType: "",
        raw: text,
      });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("extract-receipt error", error);
    return res.status(500).json({
      error: error.message || "Failed to extract receipt data",
    });
  }
}
