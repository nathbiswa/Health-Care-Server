const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// ================= MONGODB =================
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// ================= JOSE-CJS FIX =================
const jose = require("jose-cjs");
const createRemoteJWKSet = jose.createRemoteJWKSet;
const jwtVerify = jose.jwtVerify;

// ================= CLIENT =================
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// ================= JWKS =================
let JWKS;
try {
    JWKS = createRemoteJWKSet(
        new URL('http://localhost:3000/api/auth/jwks')
    );
} catch (err) {
    console.log("JWKS init failed");
}

// ================= VERIFY TOKEN =================
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload;
        next();
    } catch (error) {
        console.log("JWT ERROR:", error.message);
        return res.status(401).json({ message: "Invalid token" });
    }
};

// ================= RUN =================
async function run() {
    try {
        // await client.connect();
        console.log("MongoDB connected successfully!");

        const db = client.db('healthcare');

        const doctorsCollection = db.collection('doclist');
        const bookingCollection = db.collection('booking');
        const usersCollection = db.collection('users');

        // ================= DOCTORS =================
        app.get('/doclist', async (req, res) => {
            const result = await doctorsCollection.find().toArray();
            res.send(result);
        });

        // =================== TOP RATED DOCTORS =================
        app.get('/toprated', async (req, res) => {
            const cursor = doctorsCollection.find().limit(3);
            const result = await cursor.toArray();
            res.send(result);
        })


        // ================= DOCTOR DETAILS =================
        app.get('/doclist/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const result = await doctorsCollection.findOne({
                _id: new ObjectId(id)
            });
            res.send(result);
        });

        // ================= SEARCH =================
        app.get('/search', async (req, res) => {
            const q = req.query.q;

            if (!q) return res.send([]);

            const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            const result = await doctorsCollection.find({
                $or: [
                    { name: { $regex: safe, $options: "i" } },
                    { specialty: { $regex: safe, $options: "i" } },
                    { hospital: { $regex: safe, $options: "i" } },
                ]
            }).toArray();

            res.send(result);
        });

        // ================= CREATE BOOKING =================
        app.post("/booking", async (req, res) => {
            const booking = req.body;

            if (!booking.email) {
                return res.status(400).send({ message: "Email required" });
            }

            const result = await bookingCollection.insertOne(booking);

            res.send({
                success: true,
                insertedId: result.insertedId,
            });
        });

        // ================= GET BOOKING =================
        app.get("/booking", async (req, res) => {
            const email = req.query.email;

            if (!email) {
                return res.status(400).send({ message: "Email required" });
            }

            const result = await bookingCollection.find({ email }).toArray();
            res.send(result);
        });

        // ================= DELETE BOOKING =================
        app.delete("/booking/:id", async (req, res) => {
            const id = req.params.id;

            const result = await bookingCollection.deleteOne({
                _id: new ObjectId(id)
            });

            res.send({
                success: true,
                deletedCount: result.deletedCount
            });
        });

        // ================= UPDATE BOOKING =================
        app.put("/booking/:id", async (req, res) => {
            const id = req.params.id;
            const { date, time, message } = req.body;

            const result = await bookingCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        date,
                        time,
                        message,
                    }
                }
            );

            res.send({
                success: true,
                modifiedCount: result.modifiedCount
            });
        });

        // ================= UPDATE PROFILE =================
        app.put("/users/:email", async (req, res) => {
            const email = req.params.email;
            const { name, image } = req.body;

            const result = await usersCollection.updateOne(
                { email },
                {
                    $set: { name, image }
                },
                { upsert: true }
            );

            res.send(result);
        });

    } catch (error) {
        console.error("SERVER ERROR:", error);
    }
}

run();

// ================= ROOT =================
app.get('/', (req, res) => {
    res.send('Server running successfully!');
});

// ================= SERVER =================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});