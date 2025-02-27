const { v4: uuidv4 } = require('uuid');
const faunadb = require('faunadb');
const q = faunadb.query;

// Initialize the FaunaDB client with your secret
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET
});

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the incoming JSON
    const data = JSON.parse(event.body);
    const { productName, productDescription, studyParameters, questions, creatorEmail } = data;

    // Generate a unique survey ID
    const surveyId = uuidv4();

    // Create the survey record in the database
    const survey = {
      surveyId,
      productName,
      productDescription,
      studyParameters,
      questions,
      creatorEmail,
      createdAt: new Date().toISOString(),
      responses: []
    };

    // Store in FaunaDB
    await client.query(
      q.Create(
        q.Collection('surveys'),
        { data: survey }
      )
    );

    // Return the survey ID for reference and a shareable URL
    return {
      statusCode: 200,
      body: JSON.stringify({
        surveyId,
        message: 'Survey created successfully',
        shareUrl: `${process.env.URL || 'https://your-netlify-site.netlify.app'}/survey?id=${surveyId}`
      })
    };
  } catch (error) {
    console.error('Error creating survey:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create survey' })
    };
  }
};
