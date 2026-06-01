import express from 'express';
import cors from 'cors';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

let currentQR: string | null = null;
let isConnected = false;
let clientReady = false;
let connectedPhone: string | null = null;

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('qr', async (qr) => {
    console.log('QR RECEIVED');
    currentQR = await qrcode.toDataURL(qr);
    isConnected = false;
    clientReady = false;
});

client.on('ready', () => {
    console.log('Client is ready!');
    currentQR = null;
    isConnected = true;
    clientReady = true;
    connectedPhone = client.info.wid.user;
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
    isConnected = true;
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    isConnected = false;
    clientReady = false;
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    isConnected = false;
    clientReady = false;
    currentQR = null;
    connectedPhone = null;
    client.initialize(); // Restart to get a new QR
});

app.get('/api/status', (req, res) => {
    res.json({
        isConnected: clientReady,
        qrCode: clientReady ? null : currentQR,
        phone: connectedPhone
    });
});

app.post('/api/send', async (req, res) => {
    try {
        if (!clientReady) {
            return res.status(400).json({ error: 'WhatsApp client is not ready' });
        }

        const { phone, message } = req.body;
        
        if (!phone || !message) {
            return res.status(400).json({ error: 'Phone and message are required' });
        }

        // Format phone to whatsapp id
        // Remove +, spaces, -, ()
        let formattedPhone = phone.replace(/[\s\-\(\)\+]/g, '');
        // If length is 10, assume Colombia and add 57
        if (formattedPhone.length === 10) {
            formattedPhone = `57${formattedPhone}`;
        }
        
        const chatId = `${formattedPhone}@c.us`;
        
        await client.sendMessage(chatId, message);
        
        res.json({ success: true, message: 'Mensaje enviado correctamente' });
    } catch (error: any) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message || 'Error al enviar el mensaje' });
    }
});

app.post('/api/logout', async (req, res) => {
    try {
        if (isConnected) {
            await client.logout();
            res.json({ success: true, message: 'Logged out successfully' });
        } else {
            res.json({ success: true, message: 'Already disconnected' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Start client initialization
console.log('Initializing WhatsApp client...');
client.initialize();

app.listen(PORT, () => {
    console.log(`WhatsApp Microservice running on http://localhost:${PORT}`);
});
