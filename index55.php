<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Image Annotation | Elaheh Einanlou</title>
    <link rel="stylesheet" href="./index.css" />
  </head>
  <body>
    <div class="container">
      <h1>Image Annotation</h1>
      <div style="margin-bottom: 1rem">
        <button id="reloadImage">Reload Image</button>
        <button id="submitBtn">Submit</button>
      </div>

      <div class="toolbar">
        <button id="createPolygon" class="active">Create Polygon</button>
        <button id="editMode">Edit Points</button>
        <button id="deletePoint">Delete Point</button>
      </div>

      <div id="spinner"></div>
      <canvas id="canvas"></canvas>
    </div>

    <div id="modal">
      <div id="modalContent">
        Submitted completely. Thank you for your efforts.
      </div>
    </div>

    <div
      id="circleCursor"
      style="
        position: fixed;
        width: 16px;
        height: 16px;
        border: 1px solid black;
        border-radius: 50%;
        opacity: 0.3;
        pointer-events: none;
        z-index: 999;
        display: none;
      "
    ></div>

    <script src="./index55.js"></script>
  </body>
</html>
