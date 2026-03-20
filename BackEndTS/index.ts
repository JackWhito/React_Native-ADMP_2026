import { connectDB } from "./src/config/database";
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeSocket } from "./src/utils/socket";
import app from "./src/app";

const server = createServer(app);
initializeSocket(server);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((err) => {
    console.error("Failed to connect to the database", err);
    process.exit(1);
});

