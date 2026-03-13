export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { imageBase64, mimeType } = req.body || {}

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing image data' })
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text:
                  'Extract receipt data and return JSON only with these keys: vendor, date, amount, expenseType. ' +
                  'Use ISO date if possible. Expense type must be one of: Airfare, Hotel, Rental Car, Fuel, Meals, Parking / Tolls, Mileage, Ground Transport.',
              },
              {
                type: 'input_image',
                image_url: `data:${mimeType};base64,${imageBase64}`,
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()

    const text =
      data.output_text ||
      data.output?.map((o) => o.content?.map((c) => c.text).join(' ')).join(' ') ||
      '{}'

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return res.status(200).json({
        vendor: '',
        date: '',
        amount: '',
        expenseType: '',
        raw: text,
      })
    }

    return res.status(200).json(parsed)
  } catch (error) {
    console.error('extract-receipt error', error)
    return res.status(500).json({ error: 'Failed to extract receipt data' })
  }
}
