const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

module.exports = (_environment, arguments_) => {
  const isProduction = arguments_.mode === "production";

  return {
    mode: isProduction ? "production" : "development",
    entry: path.resolve(__dirname, "src/main.tsx"),
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: isProduction ? "assets/[name].[contenthash:8].js" : "assets/[name].js",
      publicPath: "/",
      clean: true,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".jsx", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: "babel-loader",
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader", "postcss-loader"],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: path.resolve(__dirname, "index.html") }),
      new webpack.DefinePlugin({
        "process.env.VITE_API_BASE_URL": JSON.stringify(
          process.env.VITE_API_BASE_URL || "",
        ),
      }),
    ],
    devtool: isProduction ? "source-map" : "eval-cheap-module-source-map",
    devServer: {
      host: "127.0.0.1",
      port: 5173,
      allowedHosts: [".app.github.dev", "localhost", "127.0.0.1"],
      historyApiFallback: true,
      hot: true,
      open: false,
    },
  };
};
