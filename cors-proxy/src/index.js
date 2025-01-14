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

		// Ambil konfigurasi Airtable dari request atau environment
		const airtableToken = requestBody.airtableToken || env.AIRTABLE_TOKEN;
		const baseId = requestBody.baseId || env.DEFAULT_BASE_ID;
		const tableName = requestBody.tableName || env.DEFAULT_TABLE_NAME;

		// Validasi konfigurasi
		if (!airtableToken || !baseId || !tableName) {
		  return new Response(JSON.stringify({
			status: 'error',
			message: 'Incomplete Airtable configuration'
		  }), {
			status: 400,
			headers: {
			  'Content-Type': 'application/json',
			  'Access-Control-Allow-Origin': '*'
			}
		  });
		}

		// Logging ke Airtable
		const airtableResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
		  method: 'POST',
		  headers: {
			'Authorization': `Bearer ${airtableToken}`,
			'Content-Type': 'application/json'
		  },
		  body: JSON.stringify({
			records: [{
			  fields: {
				'Timestamp': timestamp,
				'Sender': sender,
				'Message': message,
				'Date': date,
				'Time': time
			  }
			}]
		  })
		});

		// Cek response dari Airtable
		if (!airtableResponse.ok) {
		  const errorText = await airtableResponse.text();
		  console.error('Airtable logging failed', errorText);

		  return new Response(JSON.stringify({
			status: 'error',
			message: 'Failed to log on Airtable',
			details: errorText
		  }), {
			status: 500,
			headers: {
			  'Content-Type': 'application/json',
			  'Access-Control-Allow-Origin': '*'
			}
		  });
		}

		// Parse response Airtable
		const airtableData = await airtableResponse.json();

		// Kembalikan response sukses
		return new Response(JSON.stringify({
		  status: 'success',
		  message: 'Data successfully recorded in Airtable',
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
