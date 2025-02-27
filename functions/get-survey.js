const faunadb = require('faunadb');
const q = faunadb.query;

const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET
});

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get survey ID from query parameter
    const surveyId = event.queryStringParameters.id;

    if (!surveyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Survey ID is required' })
      };
    }

    // Query the survey from FaunaDB
    const result = await client.query(
      q.Get(
        q.Match(q.Index('survey_by_id'), surveyId)
      )
    );

    // Format the response to send only necessary data
    const survey = result.data;
    const publicSurveyData = {
      surveyId: survey.surveyId,
      productName: survey.productName,
      productDescription: survey.productDescription,
      questions: survey.questions
    };

    return {
      statusCode: 200,
      body: JSON.stringify(publicSurveyData)
    };
  } catch (error) {
    console.error('Error fetching survey:', error);

    if (error.name === 'NotFound') {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Survey not found' })
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to retrieve survey' })
    };
  }
};
