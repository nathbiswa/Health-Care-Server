const express = require('express')
const app = express()
const cors = require('cors')
const dotenv = require('dotenv')
dotenv.config();
const PORT = process.env.PORT || 8000



// Use here 

app.use(cors());
app.use(express.json());

// Mongodb start here

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Create Database
        const db = client.db('healthcare')
        const doctorsCollection = db.collection('doclist');
        const BookingCollection = db.collection('booking');

        // Find all doctor list
        app.get('/doclist', async (req, res) => {
            const result = await doctorsCollection.find().toArray();
            console.log(result);
            res.send(result);
        })

        // All booking data mongodb save
        // All booking data Post method start

        app.post("/booking", async (req, res) => {
            try {
                const booking = req.body;

                if (!booking.email) {
                    return res.status(400).send({ success: false, message: "Email required" });
                }

                const result = await BookingCollection.insertOne(booking);

                res.send({
                    success: true,
                    insertedId: result.insertedId,
                });

            } catch (error) {
                res.status(500).send({ success: false, error: error.message });
            }
        });

        // Booking data get here start
        app.get("/booking", async (req, res) => {
            try {
                const email = req.query.email;

                if (!email) {
                    return res.status(400).send({ message: "Email required" });
                }

                const bookings = await BookingCollection
                    .find({ email })
                    .toArray();

                res.send(bookings);

            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });



        // Search all doctor list
        app.get('/search', async (req, res) => {
            try {
                const searchText = req.query.q;

                if (!searchText || !searchText.trim()) {
                    return res.send([]);
                }

                const escapeRegex = (text) => {
                    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                };

                const safeText = escapeRegex(searchText);

                const result = await doctorsCollection.find({
                    $or: [
                        { name: { $regex: safeText, $options: "i" } },
                        { specialty: { $regex: safeText, $options: "i" } },
                        { hospital: { $regex: safeText, $options: "i" } },
                        { location: { $regex: safeText, $options: "i" } }
                    ]
                }).toArray();

                res.send(result);

            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });



        app.get('/doclist/:id', async (req, res) => {
            const { id } = req.params;
            const result = await doctorsCollection.findOne({ _id: new ObjectId(id) })
            res.json(result);
        })

        app.get('/toprated', async (req, res) => {
            const cursor = doctorsCollection.find().limit(3)
            const result = await cursor.toArray()
            res.send(result);
        })



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
})
