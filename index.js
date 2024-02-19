const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

const { Schema } = mongoose
mongoose.connect(process.env.DB_URL)

const userSchema = new Schema({
  username: String,
})
const User = mongoose.model('User',userSchema)

const exerciseSchema = new Schema({
  user_id: {type: String, required:true},
  description: String,
  duration: Number,
  date: Date
})
const Exercise = mongoose.model('Exercise',exerciseSchema)

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({extended:true}))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get("/api/users", async (req,res) => {
  const users = await User.find({})
  if(!users){
    res.send("No users found")
    return
  }
  res.json(users)
})

app.post("/api/users", async (req,res)=>{
  try {
    console.log(req.body)
    const user = new User({
      username: req.body.username,
    })
    const savedUser = await user.save();
    res.json({
      "username": savedUser.username,
      "_id": savedUser._id
    });
  } catch (error) {
    console.error(error);
  }
})

app.post('/api/users/:uid/exercises', async (req, res) => {
  const id = req.params.uid
  const { description, duration, date } = req.body
  try{
    const user = await User.findById(id)
    if(!user){
      res.send("User Not Found")
      return
    }
    const userExercise = new Exercise({
      user_id: id,
      description: description,
      duration: duration,
      date: date ? new Date(date) : new Date()
    })
    const exercise = await userExercise.save()
    res.json({
      "_id":user.id,
      "username":user.username,
      "date":new Date(exercise.date).toDateString(),
      "duration":exercise.duration,
      "description":exercise.description
    })
  }catch (error) {
    console.log(error)
    res.send(error)
  }
})

app.get('/api/users/:uid/logs', async (req, res) => {
  const _id = req.params.uid
  const { from, to, limit } = req.query
  const user = await User.findById(_id)
  if(!user){
    res.send("User not found")
    return
  }
  let date = {}
  if(from)  date["$gte"] = new Date(from)
  if(to)  date["$lte"] = new Date(to)
  let filter = { user_id: _id }
  if(from || to){
    filter.date = date
  }

  const exercises = await Exercise.find(filter).limit(+limit ?? 500)

  const log = exercises.map(e => ({
    "description":e.description,
    "duration":e.duration,
    "date":e.date.toDateString()
  }))
  res.json({
    "_id": user._id,
    "username": user.username,
    "count": parseInt(exercises.length),
    "log": log,
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
