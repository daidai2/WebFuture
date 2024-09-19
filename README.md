# WebFuture

This repository provides the source code for the paper **"WebFuture: Towards Zero-Programming Website Generation"**.

## Introduction

**WebFuture** is a tool powered by Large Language Models (LLMs) designed to facilitate practical website generation and deployment without requiring programming skills.

## Getting Started

1. Clone or download the project to your local environment.
2. Install external libraries by running the following command:

    ```bash
    npm install
    ```
3. Enter your LLM API key in the console (replace `X` with your actual key), then run the project:

    ```bash
    $env:OPENAI_API_KEY=X
    npm run dev
    ```

4. Once the project is running, open `localhost:3000` in your browser to start generating your website.

## Tool Structure

### Skeleton Construction

**Route**:`localhost:3000`

**Functionality**: Based on [tldraw](https://github.com/tldraw/tldraw), this module allows users to either draw or upload a low-fidelity wireframe. By clicking the **Generate Skeleton** button, the system generates a corresponding webpage skeleton.。

![Skeleton Construction](./ReadMeFile/Skeleton%20Construction.jpeg)

### Collaborative Optimization

**Route**: `localhost:3000/UIP`

**Functionality**: Users can enter natural language commands in the dialog box at the bottom right corner to modify the webpage dynamically based on their input.![Collaborative Optimization](./ReadMeFile/Collaborative%20Optimization.jpeg)

### Page Briding

**Route**: `localhost:3000/FEA`

**Functionality**: By clicking the **Import Files** button, users can import files into the system. After filling out the **Bridging Anchors Table**, they can click the **Inject Code** button to insert navigation code between pages. Once all pages are set up, the **Page Bridging** button finalizes the integration between all generated pages.

![Page Briding](./ReadMeFile/Page%20Briding.jpeg)

## License

This project is intended for educational and collaborative purposes.  

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License. You can view the full license [here](./LICENSE).

