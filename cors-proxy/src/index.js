export default {
	async fetch(request, env, ctx) {
	  // Handle CORS preflight requests
	  if (request.method === 'OPTIONS') {
		return new Response(null, {
		  headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '86400'
		  }
		});
	  }

	  // Hanya terima metode POST
	  if (request.method !== 'POST') {
		return new Response('Method Not Allowed', {
		  status: 405,
		  headers: {
			'Access-Control-Allow-Origin': '*'
		  }
		});
	  }

	  try {
		// Parse body dari request
		const requestBody = await request.json();

		// Ekstrak data dengan penanganan default
		const message = requestBody.message || 'No message content';
		const sender = requestBody.sender || 'Unknown';
		const date = requestBody.date || 'N/A';
		const time = requestBody.time || 'N/A';
		const timestamp = requestBody.timestamp || new Date().toISOString();

		// Logging ke Discord
		const discordWebhook = env.DISCORD_WEBHOOK_URL;
		const discordResponse = await fetch(discordWebhook, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify({
			content: "New Message Logged",
			embeds: [{
			  title: "Message Details",
			  fields: [
				{ name: "Sender", value: sender || 'Unknown', inline: true },
				{ name: "Date", value: date || 'N/A', inline: true },
				{ name: "Time", value: time || 'N/A', inline: true },
				{ name: "Timestamp", value: timestamp || 'N/A', inline: false },
				{ name: "Message", value: message || 'No message content', inline: false }
			  ],
			  color: 3066993 // Warna hijau
			}]
		  })
		});

		// Logging ke Airtable
		const airtableResponse = await fetch('https://api.airtable.com/v0/appb7r1094g6sRK9j/Table1', {
		  method: 'POST',
		  headers: {
			'Authorization': `Bearer ${env.AIRTABLE_TOKEN}`,
			'Content-Type': 'application/json'
		  },
		  body: JSON.stringify({
			records: [{
			  fields: {
				'Timestamp': timestamp,
				'Sender': sender,
				'Message': message
			  }
			}]
		  })
		});

		// Cek response dari Discord dan Airtable
		if (!discordResponse.ok) {
		  console.error('Discord logging failed', await discordResponse.text());
		}

		if (!airtableResponse.ok) {
		  const errorText = await airtableResponse.text();
		  console.error('Airtable logging failed', errorText);

		  // Tambahkan logging error yang lebih detail
		  return new Response(JSON.stringify({
			status: 'error',
			message: 'Airtable logging failed',
			details: errorText
		  }), {
			status: 500,
			headers: {
			  'Content-Type': 'application/json',
			  'Access-Control-Allow-Origin': '*'
			}
		  });
		}

		// Parse response Airtable untuk mendapatkan detail record
		const airtableData = await airtableResponse.json();

		// Kembalikan response sukses
		return new Response(JSON.stringify({
		  status: 'success',
		  message: 'Data logged to Discord and Airtable successfully',
		  airtableRecords: airtableData.records.map(record => record.id)
		}), {
		  status: 200,
		  headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		  }
		});

	  } catch (error) {
		// Tangani error
		console.error('Logging error:', error);
		return new Response(JSON.stringify({
		  status: 'error',
		  message: error.message
		}), {
		  status: 500,
		  headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		  }
		});
	  }
	}
  };
