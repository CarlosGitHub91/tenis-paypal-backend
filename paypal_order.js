const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

const CLIENT = process.env.CLIENT;
const SECRET = process.env.SECRET;

app.post('/create-paypal-order', async (req, res) => {
  try {
    const base64 = Buffer.from(`${CLIENT}:${SECRET}`).toString('base64');
    const tokenResponse = await axios({
      url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      method: 'post',
      headers: {
        Authorization: `Basic ${base64}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: 'grant_type=client_credentials',
    });
    const accessToken = tokenResponse.data.access_token;

    const { amount, currency } = req.body;
    const orderResponse = await axios({
      url: 'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      method: 'post',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount,
          },
        }],
        application_context: {
          return_url: "https://your-app/callback/success",
          cancel_url: "https://your-app/callback/cancel",
        },
      },
    });

    return res.json({
      id: orderResponse.data.id,
      approveUrl: orderResponse.data.links.find(
        (l) => l.rel === "approve"
      ).href,
    });
  } catch (err) {
    console.error(err.response ? err.response.data : err);
    return res.status(500).json({error: 'PayPal order creation failed'});
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`PayPal server listening on ${PORT}`));
