const { PrismaClient }  = require('@prisma/client')
const express = require('express')
const cors = require('cors')

const app = express()
const port = 3000
const http = require('http').Server(app);

const socketIO = require('socket.io')(http, {
  cors: {
      origin: "http://localhost:3001"
  }
});

const prisma = new PrismaClient()

app.use(cors())
app.use(express.json())

// CHATS
app.get('/chats', async (req, res) => {
    const result = await prisma.chat.findMany({
        include: {
            messages: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 1
            },
        },
      })
    res.send(result)
})
app.post('/chats', async (req, res) => {
  await prisma.chat.create({
    data: {
      title: req.body.title,
    }
  })
  res.send({status: 'ok'})
})
app.delete('/chats', async (req, res) => {
  await prisma.chat.delete({
    where: {
      id: req.body.id
    }
  })
  res.send({status: 'ok'})
})

// MESSAGES
app.get('/chats/:chatId/messages', async (req, res) => {
  const chatId = req.params.chatId

  const result = await prisma.message.findMany({
    where: {
      chatId: Number(chatId)
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  res.send(result)
})

socketIO.on('connection', (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  socket.on('disconnect', () => {
    console.log('🔥: A user disconnected');
  });

  socket.on('message', (data) => {
    console.log('data', data)
  })
  socket.on('shouting', (data) => {
    console.log('shouting data', data)
  })
  socket.on('new_message', async (data) => {
    console.log('new_message', data)

    const res = await prisma.message.create({
      data: {
        text: data.text,
        chatId: data.chatId,
        sender: true,
      }
    })
    socket.emit('sent_message_saved', res)

    setTimeout(async () => {
      const result = await prisma.message.create({
        data: {
          text: `Server response🔥: [${data.text}]`,
          chatId: data.chatId,
          sender: false,
        }
      })
      console.log('sending response:', result)
      socket.emit('receive_message', result)
    }, 1500)
    // console.log('res', res)
  })
});
  
http.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

// main()
//   .then(async () => {
//     await prisma.$disconnect()
//   })
//   .catch(async (e) => {
//     console.error(e)
//     await prisma.$disconnect()
//     process.exit(1)
//   })