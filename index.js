const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(express.json())
app.use(cors())

const verifyJwt = (req,res, next) => {
    const auth = req.headers.authorization;
    if(!auth){
        return res.send({message: 'Unauthorized access'})
    }
    const token = auth.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, function(err, decoded) {
         if(err){
             return res.send({ message: 'Forbidden access'})
         }
         req.decoded = decoded;
         next()
    });
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const res = require('express/lib/response');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.b9kyf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try {
        await client.connect()
        const todosCollection = client.db('todosCollection').collection('todos')
        const usersCollection = client.db('todosCollection').collection('user')

        app.get('/todos', verifyJwt, async (req,res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if(email === decodedEmail){
                const query = { email: email }
                const result = await todosCollection.find(query).toArray()
                res.send(result)
            } else {
                return res.send({message: 'Forbidden access'})
            }
           
        })

        app.post('/todos', async (req,res) =>{
            const todo = req.body
            const result = await todosCollection.insertOne(todo);
            res.send(result)
        })

        app.put('/user/:email', async (req,res) =>{
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const option = { upsert: true }
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, option);
            const accessToken = jwt.sign({ email: email }, process.env.ACCESS_SECRET_TOKEN)
            res.send({ result, token: accessToken})
        })

        app.put('/todos/:id', async (req,res) =>{
            const id = req.params.id
            const filter = { _id: ObjectId(id)};
            const update = {
                $set: {
                    completed: true
                }
            }
            const result = await todosCollection.updateOne(filter, update);
            res.send(result)
        })

        app.delete('/todos/:id', async (req,res) =>{
            const id = req.params.id
            console.log(id);
            const query = { _id: ObjectId(id)};
            const result = await todosCollection.deleteOne(query);
            if (result.deletedCount === 1) {
                console.log("Successfully deleted one document.");
              } else {
                console.log("No documents matched the query. Deleted 0 documents.");
              }
            res.send(result)
        })
    }
    finally{
        // client.close()
    }
}

run().catch(console.dir)

app.get('/', (req,res) => {
    res.send('Server Is Running')
})

app.listen(port, () => {
    console.log(`Port is running at http://localhost:${port}`);
})