require('dotenv').config();
const secret = process.env.API_KEY;
const stripe = require('stripe')(secret);

const dryrun = true;
const excludedStatuses = ["incomplete", "incomplete_expired", "canceled", "unpaid", "past_due"];

var refundAmount = 0;
var customerCount = 0;
var ignored = 0;
var tooLowAmount = 0;
var tooLowCustomers = 0;


const excludeCustomers = ['cus_KRwRxc0iRbKrFz'];

function getSubscriptions() { 
    return stripe.subscriptions.list({limit: 100, status: "all"})
        .autoPagingEach(async (subscription) => {
            if (!excludedStatuses.includes(subscription.status) && subscription.collection_method === "charge_automatically") {
                var period_end = subscription.current_period_end;
                var refund_day = new Date(new Date().setUTCFullYear(2023, 0, 1)).setUTCHours(0,0,0,0)/1000;

                const charges = await stripe.charges.list({
                    customer: subscription.customer,
                }).then(async data => {
                    if (data.data.length > 0) {
                        const succeededCharges = data.data.filter(charge => charge.status === "succeeded");
                        if (succeededCharges.length > 0) {
                            const latestCharge = succeededCharges.reduce((a,b) => a.created > b.created ? a : b);
                            const invoice = await stripe.invoices.retrieve(latestCharge.invoice).then(async invoice => {
                                const periodStart = invoice.finalized_at;
                                const periodEnd = periodStart + getInterval(subscription.plan.interval, subscription.plan.interval_count);
                                
                                //console.log(latestCharge);

                                if (periodStart <= refund_day && periodEnd >= refund_day) {
                                    var remainingTime = periodEnd - refund_day;
                                    let refund = Math.ceil(latestCharge.amount * (remainingTime / getInterval(subscription.plan.interval, subscription.plan.interval_count)))/100;
                                    console.log("- " + subscription.customer);
                                    console.log(`- Refund: ${refund}/${latestCharge.amount/100} kr`)
                                    if (refund >= 5) {
                                        if (!dryrun && !excludeCustomers.includes(subscription.customer)) {
                                            //DO REFUND
                                            const res = await stripe.refunds.create({
                                                charge: latestCharge.id,
                                                amount: Math.round(refund * 100)
                                            }).then(refund => {
                                                console.log()
                                            });

                                            console.log(res);
                                        } else {
                                            console.log(`- Would have refunded ${Math.round(refund * 100)} øre here`);
                                        }
                                        refundAmount += refund;
                                        customerCount++;
                                    } else {
                                        tooLowAmount += refund;
                                        tooLowCustomers++;
                                    }
                                } else {
                                    console.log("Ignored: " + subscription.customer);
                                    ignored++;
                                }
                            });
                        }
                    }
                });
            }
        })
};


function getInterval(strInterval, intervalN) {
    const day = 86400;
    const week = 604800;
    const month = 2629743;
    const year = 31536000;
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
    console.log(`Amount: ${refundAmount} kr`);
    console.log(`nRefunds: ${customerCount}`);
    console.log(`nIgnored: ${ignored}`);
    console.log(`Too low:`)
    console.log(`Amount: ${tooLowAmount} kr`);
    console.log(`nCustomers: ${tooLowCustomers}`);
})