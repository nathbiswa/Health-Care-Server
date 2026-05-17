const express = require('express')
const app = express()
const cors = require('cors')
const dotenv = require('dotenv')
dotenv.config();
const PORT = process.env.PORT || 8000



// Use here 

app.use(cors());
app.use(express.json());






app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
})
