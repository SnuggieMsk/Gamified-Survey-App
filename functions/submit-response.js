const faunadb = require('faunadb');
const q = faunadb.query;

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
    const { surveyId, responses } = data;

    if (!surveyId || !responses) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Survey ID and responses are required' })
      };
    }

    // Query the survey
    const survey = await client.query(
      q.Get(
        q.Match(q.Index('survey_by_id'), surveyId)
      )
    );

    // Add the new response with timestamp
    const newResponse = {
      timestamp: new Date().toISOString(),
      data: responses
    };

    // Update the survey document with the new response
    await client.query(
      q.Update(
        survey.ref,
        {
          data: {
            responses: q.Append([newResponse], survey.data.responses)
          }
        }
      )
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Response submitted successfully' })
    };
  } catch (error) {
    console.error('Error submitting response:', error);

    if (error.name === 'NotFound') {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Survey not found' })
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to submit response' })
    };
  }
};
