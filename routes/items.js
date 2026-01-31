const express = require("express");
const router = express.Router();
const itemsController = require("../controllers/ItemsController");

router.post("/", itemsController.createItem);
router.get("/", itemsController.getAllItems);
router.get("/:uuid", itemsController.getItemByUuid);
router.put("/:uuid", itemsController.updateItem);
router.delete("/:uuid", itemsController.deleteItem);

module.exports = router;
