require('dotenv').config();
const secret = process.env.API_KEY;
const stripe = require('stripe')(secret);

const oldPlanID = "monthly2020";
const newPlanID = "monthly2023";

const dryrun = false;
var affectedSubscriptions = 0;
const excludedStatuses = ["incomplete_expired", "canceled"];


function getSubscriptions() { 
    return stripe.subscriptions.list({limit: 100, price: oldPlanID, status: "all"})
        .autoPagingEach((incomingSubscription) => {
            if (incomingSubscription.plan.id === oldPlanID) {
                if (!excludedStatuses.includes(incomingSubscription.status)) {
                    const cancel_at_period_end = incomingSubscription.cancel_at_period_end;
                    console.log(`${dryrun ? '(Dryrun) - ' : ""}Moving ${incomingSubscription.id} from ${incomingSubscription.plan.id} to ${newPlanID}. Quantity ${incomingSubscription.quantity}`);

                    if (!dryrun) {
                        affectedSubscriptions++;
                        const subscriptionItemID = incomingSubscription.items.data[0].id;
                        
                        stripe.subscriptionItems.update(
                            subscriptionItemID,
                            { price: newPlanID, proration_behavior: "none", quantity: incomingSubscription.quantity });
                        
                        if (cancel_at_period_end) {
                            stripe.subscriptions.update(
                                incomingSubscription.id,
                                {cancel_at_period_end: cancel_at_period_end}
                            );
                        } 
                    } else affectedSubscriptions++;
                }
            }
        })
};


getSubscriptions().then((status) => {
    console.log(`${dryrun ? '(Dryrun) - ' : ""}Operation success on ${affectedSubscriptions} subscriptions`);
})