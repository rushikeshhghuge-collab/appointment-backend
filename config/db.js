import mongoose from "mongoose";
import dns from "dns";

// Fixes MongoDB Atlas SRV lookup failures on some Windows setups
// (ECONNREFUSED / querySrv ENOTFOUND errors). Node's own c-ares resolver
// sometimes ignores the OS-configured DNS server (especially if a VPN,
// Docker, or VirtualBox virtual adapter left a stale DNS entry behind),
// so we force it to use Google DNS directly instead of just reordering results.
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
