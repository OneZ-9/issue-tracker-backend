export default function handleError({ res, metaData, error }) {
  res.status(metaData?.RESPONSE_CODE || 500).json({
    status: metaData?.STATUS || "status not defined",
    message: metaData?.MESSAGE || "metadata not defined",
    error: error.message,
  });
}
