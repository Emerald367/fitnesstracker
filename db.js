const { createClient } = require('@supabase/supabase-js')
const env = require('dotenv').config();
const supabaseURL = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseURL, supabaseKey);


async function testConnection() {
    let { data, error } = await supabase.from('exercise').select();

    if (error) {
    console.log('Error connecting to Supabase', error.message);
    } else {
    console.log('Successfully connected to Supabase');
    }
}


testConnection()



















module.exports = supabase;