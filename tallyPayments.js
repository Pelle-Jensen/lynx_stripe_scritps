require('dotenv').config();
const secret = process.env.API_KEY;
const stripe = require('stripe')(secret);

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function getPaidPayments(month) {
    // Initialize an empty object to store the tally of payments by product
    const paymentTally = {};

    // Set the starting time for the time range to retrieve payments
    let startTime = new Date(new Date().setUTCFullYear(2022,month,1)).setUTCHours(0,0,0,0);
    
    // Set the ending time for the time range to retrieve payments
    let endTime = new Date(new Date().setUTCFullYear(2022,month + 1,1)).setUTCHours(0,0,0,0);
    
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

    const monthData = {};
    // Get the tally of paid payments by product
    for (var i = 0; i < monthNames.length; i++) {
        const monthName = monthNames[i];
        monthData[monthName] = await getPaidPayments(i);
        console.log("Finished " + monthName);
    }
    // Initialize an array of rows for the Excel sheet
    const rows = [['Product', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']];

    const products = [];
    for (var i = 0; i < Object.keys(monthData).length; i++) {
        Object.keys(monthData[monthNames[i]]).forEach(product => {
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
            monthData['January'][product] ? Math.round(monthData['January'][product]) + ' kr' : "0 kr", 
            monthData['February'][product] ? Math.round(monthData['February'][product]) + ' kr' : "0 kr", 
            monthData['March'][product] ? Math.round(monthData['March'][product]) + ' kr' : "0 kr", 
            monthData['April'][product] ? Math.round(monthData['April'][product]) + ' kr' : "0 kr", 
            monthData['May'][product] ? Math.round(monthData['May'][product]) + ' kr' : "0 kr", 
            monthData['June'][product] ? Math.round(monthData['June'][product]) + ' kr' : "0 kr", 
            monthData['July'][product] ? Math.round(monthData['July'][product]) + ' kr' : "0 kr", 
            monthData['August'][product] ? Math.round(monthData['August'][product]) + ' kr' : "0 kr", 
            monthData['September'][product] ? Math.round(monthData['September'][product]) + ' kr' : "0 kr", 
            monthData['October'][product] ? Math.round(monthData['October'][product]) + ' kr' : "0 kr", 
            monthData['November'][product] ? Math.round(monthData['November'][product]) + ' kr' : "0 kr", 
            monthData['December'][product] ? Math.round(monthData['December'][product]) + ' kr' : "0 kr", 
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