const UpdateProfileImage = async (req, res) => {
    const userId = req.user.id;
    const { image } = req.body; // Expecting Base64 string
    const db = require('../database/dbcon');

    try {
        if (!image) return res.status(400).send("No image provided");

        await db.query(
            'UPDATE student SET image = $1 WHERE id = $2',
            [image, userId]
        );

        res.status(200).json({ message: "Profile image updated successfully" });
    } catch (err) {
        console.error("Update Image Error:", err.message);
        res.status(500).send("Server Error");
    }
};

module.exports = { UpdateProfileImage };