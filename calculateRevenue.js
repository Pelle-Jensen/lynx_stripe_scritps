require('dotenv').config();
const secret = process.env.API_KEY;
const stripe = require('stripe')(secret);


async function calculateExpectedRevenue() {
    // Set the start and end dates for the current month
    const startDate = new Date();
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    console.log(startDate);
    console.log(endDate);


    // Initialize variables to track the total expected revenue and number of subscribers
    let totalExpectedRevenue = 0;
    let numSubscribers = 0;

    // Fetch all of the subscribers for your account
    let subscribers = await stripe.subscriptions.list({
        limit: 100,
    });

    // Iterate through the subscribers and calculate the expected revenue for each one
    while (subscribers.data.length > 0) {
        for (const subscriber of subscribers.data) {
            // Check if the subscriber is likely to pay
            if (isLikelyToPay(subscriber)) {
                // Increment the number of subscribers
                numSubscribers++;
                const periodStart = new Date().setTime(subscriber.current_period_start * 1000);
                const periodEnd = new Date().setTime(subscriber.current_period_end * 1000);

                if (periodStart >= startDate || periodEnd < endDate) {
                    totalExpectedRevenue += subscriber.plan.amount
                }
            }
        }

        // Fetch the next page of subscribers
        subscribers = await stripe.subscriptions.list({
            limit: 100,
            starting_after: subscribers.data[subscribers.data.length - 1].id,
        });
    }

    // Return the total expected revenue and number of subscribers
    return {
        totalExpectedRevenue: totalExpectedRevenue,
        numSubscribers: numSubscribers,
    };
}

// Helper function to determine if a subscriber is likely to pay
function isLikelyToPay(subscriber) {
    // Check if the subscription is currently active
    if (subscriber.status !== "active") {
        return false;
    }

    // Check if the subscription has a positive price
    if (subscriber.plan.amount <= 0) {
        return false;
    }

    // If all checks pass, the subscriber is likely to pay
    return true;
}

// Calculate the expected revenue
const expectedRevenue = calculateExpectedRevenue().then((res) => {
    console.log(`Total expected revenue: ${res.totalExpectedRevenue / 100} kr`);
    console.log(`Number of subscribers: ${res.numSubscribers}`);
});

