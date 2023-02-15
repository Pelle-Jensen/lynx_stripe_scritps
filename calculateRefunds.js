require('dotenv').config();
const secret = process.env.API_KEY;
const stripe = require('stripe')(secret);

const dryrun = false;
var customers = {
    month: 0,
    quarter: 0,
    year: 0
};
var total = {
    month: 0,
    quarter: 0,
    year: 0
};

const excludedStatuses = ["incomplete", "incomplete_expired", "canceled", "unpaid", "past_due"];


function getSubscriptions() { 
    return stripe.subscriptions.list({limit: 100, status: "all"})
        .autoPagingEach(async (subscription) => {
            if (!excludedStatuses.includes(subscription.status) && subscription.collection_method === "charge_automatically") {
                var period_end = subscription.current_period_end;
                var refund_day = new Date(new Date().setUTCFullYear(2023, 0, 1)).setUTCHours(0,0,0,0)/1000
                var remainingTime = period_end - refund_day;

                console.log(remainingTime);

                if (remainingTime > 0) {
                    let refund = Math.ceil(subscription.plan.amount * (remainingTime / getInterval(subscription.plan.interval, subscription.plan.interval_count)))/100;
                    const charges = await stripe.charges.list({
                        customer: subscription.customer
                    }).then();

                    if (charges.length > 0) {
                        const succeededCharges = charges.filter(charge => charge.status == "succeeded");
                        const latestCharge = succeededCharges.reduce((a,b) => a.created - b.created);
                        console.log(latestCharge);
                    }

                    
                    switch (subscription.plan.interval) {
                        case "month":
                            if (subscription.plan.interval_count === 1) {
                                total.month += refund;
                                customers.month++;
                            }
                            if (subscription.plan.interval_count === 3) {
                                total.quarter += refund;
                                customers.quarter++;
                            }
                            break;
                        case "year":
                            total.year += refund;
                            customers.year++;
                            break;
                    }
                }
            }
        })
};


function getInterval(strInterval, intervalN) {
    const day = 86400;
    const week = 604800;
    const month = 2629743;
    const year = 31556926;
    switch (strInterval) {
        case "day":
            return day * intervalN;
        case "week":
            return week * intervalN;
        case "month":
            return month * intervalN;
        case "year":
            return year * intervalN;
    }
}


getSubscriptions().then((status) => {
    console.log(`
        Måned:\n
            Kunder: ${customers.month}\n
            Refund: ${Math.ceil(total.month)} kr\n
        Kvartal:\n
            Kunder: ${customers.quarter}\n
            Refund: ${Math.ceil(total.quarter)} kr\n
        År:\n
            Kunder: ${customers.year}\n
            Refund: ${Math.ceil(total.year)} kr\n
        Totalt:\n
            Kunder: ${customers.month + customers.quarter + customers.year}\n
            Refund: ${Math.ceil(total.month) + Math.ceil(total.quarter) + Math.ceil(total.year)} kr\n
    `)
})