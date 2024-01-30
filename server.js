const express = require("express");
const app = express();
const dotenv = require("dotenv");
const {connectDB} = require('./models/db');
const cors = require('cors')
const globalErrorHandler = require('./controller/errorController.js');
dotenv.config()
const PORT = process.env.PORT || 8080
const { fetchBSEData } = require('./utils/script.js');

(async()=>{
    await connectDB().then(async()=>{
        // await fetchBSEData();
    })
})();

app.use(express.json())
app.use(cors());

app.use('/share',require('./routes/shareRoute'))


app.use(globalErrorHandler);

app.get('/',(req,res)=>{
    res.send("SERVER RUNNING")
})
app.listen(PORT,async()=>{
    console.log(`Server is Running at Port ${PORT}`);
})