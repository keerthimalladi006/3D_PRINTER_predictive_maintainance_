"""
Backend API for 3D Printer Predictive Maintenance
Flask application with RESTful endpoints.
"""

import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sys
from pathlib import Path

# Add backend directory to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from services.data_service import data_service
from services.ml_service import ml_service

FRONTEND_DIST = backend_path.parent / "frontend" / "dist"

app = Flask(__name__, static_folder=str(FRONTEND_DIST) if FRONTEND_DIST.exists() else None)
CORS(app)  # Enable CORS for frontend access


@app.route('/api/ping', methods=['GET'])
def api_ping():
    """API health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "3D Printer Predictive Maintenance API",
        "version": "1.0.0"
    })


@app.route('/api/machine-status', methods=['GET'])
def get_machine_status():
    """
    Get current machine status.

    Query params:
        limit: Number of recent entries to return (default: 100)

    Returns:
        Combined health status and electrical context.
    """
    try:
        limit = request.args.get('limit', 100, type=int)
        status = data_service.get_machine_status(limit=limit)
        return jsonify(status)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/vibration', methods=['GET'])
def get_vibration():
    """
    Get vibration features.

    Query params:
        window_index: Specific window index (optional)
        limit: Number of windows to return if no index specified (default: 100)

    Returns:
        Windowed time-domain vibration features.
    """
    try:
        window_index = request.args.get('window_index', type=int)
        limit = request.args.get('limit', 100, type=int)

        features = data_service.get_vibration_features(
            window_index=window_index,
            limit=limit
        )
        return jsonify({"features": features})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
def get_health():
    """
    Get health indicator data.

    Query params:
        limit: Number of entries to return (default: 100)

    Returns:
        Health scores, condition states, and summary statistics.
    """
    try:
        limit = request.args.get('limit', 100, type=int)
        health_data = data_service.get_health_data(limit=limit)
        return jsonify(health_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/anomalies', methods=['GET'])
def get_anomalies():
    """
    Get detected anomalies.

    Query params:
        method: "statistical", "isolation_forest", or "both" (default: "both")
        limit: Maximum number of anomalies to return (default: 50)

    Returns:
        Anomaly records with detection method flags.
    """
    try:
        method = request.args.get('method', 'both')
        limit = request.args.get('limit', 50, type=int)

        if method not in ["statistical", "isolation_forest", "both"]:
            return jsonify({"error": "Invalid method. Use: statistical, isolation_forest, or both"}), 400

        anomalies = data_service.get_anomalies(method=method, limit=limit)
        return jsonify(anomalies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/maintenance', methods=['GET'])
def get_maintenance():
    """
    Get maintenance recommendations.

    Returns:
        Rule-based maintenance recommendation based on current health state.
    """
    try:
        recommendation = data_service.get_maintenance_recommendations()
        return jsonify(recommendation)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/electrical', methods=['GET'])
def get_electrical():
    """
    Get electrical power context.

    Query params:
        limit: Number of entries to return (default: 100)

    Returns:
        Electrical power, current, voltage, and stage labels.
    """
    try:
        limit = request.args.get('limit', 100, type=int)
        electrical_data = data_service.get_electrical_context(limit=limit)
        return jsonify(electrical_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/predict', methods=['POST'])
def predict_condition():
    """
    Predict machine condition using ML model.

    Request body:
        JSON object with feature names and values

    Returns:
        Prediction, condition, probability, and confidence.
    """
    try:
        features = request.json
        if not features:
            return jsonify({"error": "No features provided"}), 400

        prediction = ml_service.predict(features)
        return jsonify(prediction)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/predict/batch', methods=['POST'])
def predict_batch():
    """
    Predict condition for multiple feature sets.

    Request body:
        JSON array of feature dictionaries

    Returns:
        Array of prediction results.
    """
    try:
        features_list = request.json
        if not isinstance(features_list, list):
            return jsonify({"error": "Expected array of feature dictionaries"}), 400

        predictions = ml_service.predict_batch(features_list)
        return jsonify({"predictions": predictions})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/predict/latest', methods=['GET'])
def predict_latest():
    """
    Predict condition for the latest sensor window.

    Returns:
        ML prediction for the most recent data window.
    """
    try:
        # Get latest window features
        latest_features = data_service.get_vibration_features(limit=1)
        if not latest_features:
            return jsonify({"error": "No data available"}), 404

        # Extract features (exclude metadata)
        feature_dict = latest_features[0]
        metadata_keys = ['window_index', 'window_start', 'window_end', 'window_size', 'timestamp', 'label']
        for key in metadata_keys:
            feature_dict.pop(key, None)

        # Predict
        prediction = ml_service.predict(feature_dict)

        # Add metadata
        prediction['window_index'] = latest_features[0]['window_index']
        prediction['timestamp'] = latest_features[0]['timestamp']

        return jsonify(prediction)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve SPA static frontend or return API index."""
    if path.startswith('api/'):
        return jsonify({"error": "Endpoint not found"}), 404
        
    if path != "" and FRONTEND_DIST.exists() and (FRONTEND_DIST / path).exists():
        return send_from_directory(FRONTEND_DIST, path)
    elif FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
        return send_from_directory(FRONTEND_DIST, "index.html")
    else:
        return jsonify({
            "service": "3D Printer Predictive Maintenance API",
            "status": "running",
            "note": "Frontend dist not found. Build frontend to serve UI at root."
        })


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting 3D Printer Predictive Maintenance API on port {port}...")
    print("Available endpoints:")
    print("  GET /api/ping - API health check")
    print("  GET /api/machine-status - Machine status (health + electrical)")
    print("  GET /api/vibration - Vibration features")
    print("  GET /api/health - Health indicator data")
    print("  GET /api/anomalies - Detected anomalies")
    print("  GET /api/maintenance - Maintenance recommendations")
    print("  GET /api/electrical - Electrical context")
    print("  POST /api/predict - ML prediction for provided features")
    print("  POST /api/predict/batch - ML prediction for multiple feature sets")
    print("  GET /api/predict/latest - ML prediction for latest window")
    print()
    app.run(host='0.0.0.0', port=port, debug=True)

