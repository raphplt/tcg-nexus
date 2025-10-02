// Test script to verify collection endpoints work
const axios = require("axios");

async function testCollections() {
	const baseURL = "http://localhost:3001";

	// Test data
	const userId = 1;
	const collectionId = "test-collection-id";
	const pokemonCardId = "test-card-id";

	console.log("🧪 Testing collection endpoints...");

	try {
		// Test 1: POST /collection-item/wishlist/:userId
		console.log("\n📝 Testing POST /collection-item/wishlist/:userId");
		try {
			const response = await axios.post(
				`${baseURL}/collection-item/wishlist/${userId}`,
				{
					pokemonCardId,
				}
			);
			console.log("✅ Wishlist endpoint accessible");
		} catch (error) {
			console.log(
				"❌ Wishlist endpoint failed:",
				error.response?.status,
				error.response?.data?.message || error.message
			);
		}

		// Test 2: POST /collection-item/favorites/:userId
		console.log("\n📝 Testing POST /collection-item/favorites/:userId");
		try {
			const response = await axios.post(
				`${baseURL}/collection-item/favorites/${userId}`,
				{
					pokemonCardId,
				}
			);
			console.log("✅ Favorites endpoint accessible");
		} catch (error) {
			console.log(
				"❌ Favorites endpoint failed:",
				error.response?.status,
				error.response?.data?.message || error.message
			);
		}

		// Test 3: POST /collection-item/collection/:collectionId
		console.log("\n📝 Testing POST /collection-item/collection/:collectionId");
		try {
			const response = await axios.post(
				`${baseURL}/collection-item/collection/${collectionId}`,
				{
					pokemonCardId,
				}
			);
			console.log("✅ Collection endpoint accessible");
		} catch (error) {
			console.log(
				"❌ Collection endpoint failed:",
				error.response?.status,
				error.response?.data?.message || error.message
			);
		}

		console.log("\n🎉 Tests completed!");
	} catch (error) {
		console.error("❌ Server connection failed:", error.message);
		console.log("💡 Make sure the API server is running on port 3001");
	}
}

testCollections();
