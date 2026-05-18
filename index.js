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
        const doctorsCollection = db.collection('doclist')

        // Find all doctor list
        app.get('/doclist', async (req, res) => {
            const result = await doctorsCollection.find().toArray();
            console.log(result);
            res.send(result);
        })

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
