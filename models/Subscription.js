import mongoose  from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    endpoint: {
        type: String,
        required: true,
        unique: true
    },
    keys: {
        p256dh: String,
        auth: String
    },
    username: {
        type: String,
        required: true
    }
})

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;