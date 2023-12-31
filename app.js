const AWS = require('aws-sdk');
const parseMultipart = require('parse-multipart');

const BUCKET = 'fileupload-example-bucket';

const s3 = new AWS.S3();

function extractFile(event) {
  const contentType = event.headers['Content-Type'];
  if (!contentType) {
    throw new Error('Content-Type header is missing in the request.');
  }

  const boundary = parseMultipart.getBoundary(contentType);
  if (!boundary) {
    throw new Error(
      'Unable to determine the boundary from the Content-Type header.'
    );
  }

  const parts = parseMultipart.Parse(
    Buffer.from(event.body, 'base64'),
    boundary
  );
  console.log('--------parts', parts);

  if (!parts || parts.length === 0) {
    throw new Error('No parts found in the multipart request.');
  }

  const [{ filename, data }] = parts;

  if (!filename || !data) {
    throw new Error(
      'Invalid or missing filename or data in the multipart request.'
    );
  }

  return {
    filename,
    data,
  };
}

module.exports.handle = async (event) => {
  try {
    const { filename, data } = extractFile(event);
    console.log('---------data', data);
    await s3
      .putObject({
        Bucket: BUCKET,
        Key: filename,
        Body: data,
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        link: `https://${BUCKET}.s3.amazonaws.com/${filename}`,
      }),
    };
  } catch (err) {
    console.log('error-----', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message }),
    };
  }
};

module.exports.download = async (event) => {
  try {
    const filename = event.pathParameters.filename;
    console.log('---------filename-', filename);
    s3.getObject({Bucket: BUCKET, Key: filename}).promise().then( data =>{
      return {
        statusCode: 200,
        body: data
    }})
  /*   await s3.getObject(params, (err, data) => {
        if (err) console.error(err);
        console.log(data.Body.toString());
        console.log(`file has been downloaded!`);
      })
      .promise();

    return {
      statusCode: 200,
      body: console.log(data.Body.toString()),
    }; */
  } catch (err) {
    console.log('error-----', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message }),
    };
  }
};
