require('dotenv').config();
const secret = process.env.API_KEY;
const stripe = require('stripe')(secret);

const days = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];

async function getPaidPayments(day) {
    // Initialize an empty object to store the tally of payments by product
    const paymentTally = {};

    // Set the starting time for the time range to retrieve payments
    let startTime = new Date(new Date().setUTCFullYear(2022, 11, day)).setUTCHours(0,0,0,0);
    
    // Set the ending time for the time range to retrieve payments
    let endTime = new Date(new Date().setUTCFullYear(2022, 11, day + 1)).setUTCHours(0,0,0,0);
    
    startTime = Math.round(startTime/1000);
    endTime = Math.round(endTime/1000);
    console.log(startTime);
    console.log(endTime);
    

    // Retrieve a batch of payments
    const paymentResult = await stripe.charges.list({
        created: {
            gte: startTime,
            lte: endTime,
        },
        limit: 100,
    }).autoPagingEach((payment) => {
        if (payment.paid === true) {
            // Increment the tally for the product
            if (paymentTally[`${payment.statement_descriptor}`]) {
                paymentTally[`${payment.statement_descriptor}`] += (payment.amount_captured/100) - (payment.amount_refunded/100);
            } else {
                paymentTally[`${payment.statement_descriptor}`] = (payment.amount_captured/100) - (payment.amount_refunded/100);
            }
        }
    });

    return paymentTally;
}

async function exportToExcel() {
    // Require the 'xlsx' library
    const xlsx = require('xlsx');

    const dailyData = {};
    // Get the tally of paid payments by product
    for (var i = 0; i < days.length; i++) {
        const day = days[i];
        dailyData[day] = await getPaidPayments(i);
        console.log("Finished " + day.toString());
    }
    // Initialize an array of rows for the Excel sheet
    const rows = [['Product', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]];

    const products = [];
    for (var i = 0; i < Object.keys(dailyData).length; i++) {
        Object.keys(dailyData[days[i]]).forEach(product => {
            if (!products.includes(product)) {
                console.log(product);
                products.push(product);
            }
        });
    }

    // Iterate through the payment tally
    for (const product of products) {
        // Add a row for the product and amount to the rows array
        rows.push([
            product, 
            dailyData[1][product] ? Math.round(dailyData[1][product]) + ' kr' : "0 kr", 
            dailyData[2][product] ? Math.round(dailyData[2][product]) + ' kr' : "0 kr", 
            dailyData[3][product] ? Math.round(dailyData[3][product]) + ' kr' : "0 kr", 
            dailyData[4][product] ? Math.round(dailyData[4][product]) + ' kr' : "0 kr", 
            dailyData[5][product] ? Math.round(dailyData[5][product]) + ' kr' : "0 kr", 
            dailyData[6][product] ? Math.round(dailyData[6][product]) + ' kr' : "0 kr", 
            dailyData[7][product] ? Math.round(dailyData[7][product]) + ' kr' : "0 kr", 
            dailyData[8][product] ? Math.round(dailyData[8][product]) + ' kr' : "0 kr", 
            dailyData[9][product] ? Math.round(dailyData[9][product]) + ' kr' : "0 kr", 
            dailyData[10][product] ? Math.round(dailyData[10][product]) + ' kr' : "0 kr", 
            dailyData[11][product] ? Math.round(dailyData[11][product]) + ' kr' : "0 kr", 
            dailyData[12][product] ? Math.round(dailyData[12][product]) + ' kr' : "0 kr", 
            dailyData[13][product] ? Math.round(dailyData[13][product]) + ' kr' : "0 kr", 
            dailyData[14][product] ? Math.round(dailyData[14][product]) + ' kr' : "0 kr", 
            dailyData[15][product] ? Math.round(dailyData[15][product]) + ' kr' : "0 kr", 
            dailyData[16][product] ? Math.round(dailyData[16][product]) + ' kr' : "0 kr", 
            dailyData[17][product] ? Math.round(dailyData[17][product]) + ' kr' : "0 kr", 
            dailyData[18][product] ? Math.round(dailyData[18][product]) + ' kr' : "0 kr", 
            dailyData[19][product] ? Math.round(dailyData[19][product]) + ' kr' : "0 kr", 
            dailyData[20][product] ? Math.round(dailyData[20][product]) + ' kr' : "0 kr", 
            dailyData[21][product] ? Math.round(dailyData[21][product]) + ' kr' : "0 kr", 
            dailyData[22][product] ? Math.round(dailyData[22][product]) + ' kr' : "0 kr", 
            dailyData[23][product] ? Math.round(dailyData[23][product]) + ' kr' : "0 kr", 
            dailyData[24][product] ? Math.round(dailyData[24][product]) + ' kr' : "0 kr", 
            dailyData[25][product] ? Math.round(dailyData[25][product]) + ' kr' : "0 kr", 
            dailyData[26][product] ? Math.round(dailyData[26][product]) + ' kr' : "0 kr", 
            dailyData[27][product] ? Math.round(dailyData[27][product]) + ' kr' : "0 kr", 
            dailyData[28][product] ? Math.round(dailyData[28][product]) + ' kr' : "0 kr", 
            dailyData[29][product] ? Math.round(dailyData[29][product]) + ' kr' : "0 kr", 
            dailyData[30][product] ? Math.round(dailyData[30][product]) + ' kr' : "0 kr", 
            dailyData[31][product] ? Math.round(dailyData[31][product]) + ' kr' : "0 kr", 
        ]);
    }

    // Create a new workbook and add a sheet with the rows
    const workbook = xlsx.utils.book_new();
    const sheet = xlsx.utils.aoa_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, sheet, 'Payments');

    // Write the workbook to an Excel file
    xlsx.writeFile(workbook, 'payments.xlsx');
}

exportToExcel().then(() => {
    console.log(`Finitro`);
});