const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

// adapterFn is not a function

const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// MongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');


const uri = process.env.MONGODB_URI;

// Client
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// =======JWKS Setup========
const JWKS = createRemoteJWKSet(
    new URL('http://localhost:3000/api/auth/jwks')
);

// verifyToken start
const veriryToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization
    console.log(authHeader);
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthrization" })
    }
    const token = authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: "Unauthorization" })
    }

    try {
        const { payload } = await jwtVerify(token, JWKS)
        console.log(payload)
        next()
    } catch (error) {
        return res.status(401).json({ message: "Unauthorizatiion" })
    }
}



async function run() {
    try {
        // await client.connect();

        // ================= DATABASE =================
        const db = client.db('healthcare');

        const doctorsCollection = db.collection('doclist');
        const bookingCollection = db.collection('booking');
        const usersCollection = db.collection('users');

        // ================= DOCTOR LIST =================
        app.get('/doclist', async (req, res) => {
            const result = await doctorsCollection.find().toArray();
            res.send(result);
        });

        // ================= SINGLE DOCTOR =================
        app.get('/doclist/:id', veriryToken, async (req, res) => {
            const id = req.params.id;
            const result = await doctorsCollection.findOne({
                _id: new ObjectId(id)
            });
            res.send(result);
        });

        // ================= TOP RATED =================
        app.get('/toprated', async (req, res) => {
            const result = await doctorsCollection.find().limit(3).toArray();
            res.send(result);
        });

        // ================= SEARCH DOCTOR =================
        app.get('/search', async (req, res) => {
            const searchText = req.query.q;

            if (!searchText) return res.send([]);

            const safeText = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            const result = await doctorsCollection.find({
                $or: [
                    { name: { $regex: safeText, $options: "i" } },
                    { specialty: { $regex: safeText, $options: "i" } },
                    { hospital: { $regex: safeText, $options: "i" } },
                    { location: { $regex: safeText, $options: "i" } }
                ]
            }).toArray();

            res.send(result);
        });

        // ================= BOOKING CREATE =================
        app.post("/booking", async (req, res) => {
            try {
                const booking = req.body;

                if (!booking.email) {
                    return res.status(400).send({
                        success: false,
                        message: "Email required"
                    });
                }

                const result = await bookingCollection.insertOne(booking);

                res.send({
                    success: true,
                    insertedId: result.insertedId,
                });

            } catch (error) {
                res.status(500).send({
                    success: false,
                    error: error.message
                });
            }
        });
        // ================= DELETE BOOKING =================
        app.delete("/booking/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) });

                res.send({
                    success: true,
                    deletedCount: result.deletedCount,
                });

            } catch (error) {
                res.status(500).send({
                    success: false,
                    error: error.message
                });
            }
        });

        // ================= GET BOOKING =================
        app.get("/booking", async (req, res) => {
            try {
                const email = req.query.email;

                if (!email) {
                    return res.status(400).send({
                        success: false,
                        message: "Email required"
                    });
                }

                const bookings = await bookingCollection
                    .find({ email })
                    .toArray();

                res.send(bookings);

            } catch (error) {
                res.status(500).send({
                    success: false,
                    message: error.message
                });
            }
        });

        // ================= UPDATE BOOKING =================
        app.put("/booking/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const data = req.body;

                const result = await bookingCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            date: data.date,
                            time: data.time,
                            message: data.message,
                        },
                    }
                );

                res.send(result);

            } catch (error) {
                res.status(500).send({
                    error: error.message
                });
            }
        });

        // ================= UPDATE PROFILE =================
        app.put("/users/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const data = req.body;

                const result = await usersCollection.updateOne(
                    { email },
                    {
                        $set: {
                            name: data.name,
                            image: data.image,
                        },
                    },
                    { upsert: true }
                );

                res.send(result);

            } catch (error) {
                res.status(500).send({
                    error: error.message
                });
            }
        });

        console.log("MongoDB connected successfully");

    } finally {
        // keep alive
    }
}

run().catch(console.dir);

// ================= ROOT =================
app.get('/', (req, res) => {
    res.send('Server is running successfully');
});

// ================= SERVER =================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});