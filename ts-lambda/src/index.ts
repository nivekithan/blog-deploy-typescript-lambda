export const handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
    body: `<h1>Hello World, This is written in typescript</h1>`,
  };
};
