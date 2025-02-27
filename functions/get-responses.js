const faunadb = require('faunadb');
const q = faunadb.query;
const { Parser } = require('json2csv');

const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET
});

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get survey ID from query parameters
    const surveyId = event.queryStringParameters.id;
    const format = event.queryStringParameters.format || 'json';
    const email = event.queryStringParameters.email;

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

    const survey = result.data;

    // Verify that the requester is the creator
    if (email && survey.creatorEmail !== email) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Unauthorized to access these responses' })
      };
    }

    // If CSV is requested, return a downloadable CSV file
    if (format === 'csv') {
      // Prepare data for CSV export
      const flattenedData = [];

      survey.responses.forEach(response => {
        const baseData = {
          responseTimestamp: response.timestamp
        };

        response.data.forEach((answer, index) => {
          baseData[`Q${index + 1}_Question`] = survey.questions[index].question;
          baseData[`Q${index + 1}_Response`] = answer.selectedOption;
        });

        flattenedData.push(baseData);
      });

      // Convert to CSV
      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(flattenedData);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="survey-${surveyId}-responses.csv"`
        },
        body: csv
      };
    } else {
      // Return JSON by default
      return {
        statusCode: 200,
        body: JSON.stringify({
          surveyId: survey.surveyId,
          productName: survey.productName,
          responseCount: survey.responses.length,
          responses: survey.responses
        })
      };
    }
  } catch (error) {
    console.error('Error fetching responses:', error);

    if (error.name === 'NotFound') {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Survey not found' })
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to retrieve responses' })
    };
  }
};
