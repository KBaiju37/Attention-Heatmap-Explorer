module.exports = (api) => {
  const isTest = api.env("test");

  return {
    presets: [
      ["@babel/preset-env", { targets: isTest ? { node: "current" } : ">0.25%, not dead" }],
      ["@babel/preset-react", { runtime: "automatic" }],
      ["@babel/preset-typescript", { allExtensions: true, isTSX: true }],
    ],
  };
};
