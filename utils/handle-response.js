export default function handleResponse({ res, metaData, data }) {
  res.status(metaData?.RESPONSE_CODE || 500).json({
    status: metaData?.STATUS || "status not defined",
    message: metaData?.MESSAGE || "metadata not defined",
    data: data,
  });
}
