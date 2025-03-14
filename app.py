from flask import Flask, request, render_template, jsonify, send_from_directory
import json
import hashlib
from mtcnn import MTCNN
from werkzeug.utils import secure_filename
import os
from PIL import Image
import uuid
import cv2
from flask import Flask, make_response, redirect, session, render_template, request, jsonify, g, url_for
import base64
import numpy as np
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
import time
import requests
import os
import sys
import signal
from sessionManager import LightweightRedis
import shutil
from PDFOperations import operations
from deepface import DeepFace
from retinaface import RetinaFace

app = Flask(__name__)

UPLOAD_FOLDER = 'static/uploads/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

# Function to check allowed file types
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Resize the image to a fixed size (e.g., 250 x 250)
def resize_image(image_path, target_size=(250, 250)):
    with Image.open(image_path) as img:
        img.thumbnail(target_size)
        img.save(image_path)

@app.route('/upload', methods=['POST'])
def upload_photo():
    if 'image' not in request.files:
        return jsonify({"error": "No photo part"}), 400

    photo = request.files['image']
    partyName = request.form['partyName']

    if photo and allowed_file(photo.filename):
        # Secure the filename and save it with candidate ID
        file_extension = photo.filename.rsplit('.', 1)[1].lower()
        # filename = f"{partyName}.{file_extension}"
        # filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if file_extension!='jpg':
            filename = photo.filename
            new_filename = os.path.splitext(filename)[0] + '.jpg'

            filepath = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)

            image = Image.open(photo)

            image = image.convert("RGB")  # Convert to RGB if it's not in RGB mode
            image.save(filepath, 'JPEG')  # Save the image as JPG
        else:
            filename = f"{partyName}.{file_extension}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            photo.save(filepath)

        # Resize the uploaded image
        resize_image(filepath)
        
        # Return the URL of the uploaded and resized photo
        return jsonify({"message": "Photo uploaded and resized successfully"}), 200

    return jsonify({"error": "Invalid photo format"}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    # Serve the image file from the 'uploads' directory
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/category')
def category():
    return render_template('category.html')

@app.route('/state-district.json')
def state_district():
    with open('state_district.json', 'r') as file:
        data = json.load(file)
    return data

@app.route('/SafeVote.json')
def read_json():
    with open('build/contracts/SafeVote.json', 'r') as file:
        data = json.load(file)
    return data

@app.route('/chiefLogin')
def chief_login():
    return render_template('chiefLogin.html')

@app.route('/chiefAction')
def chief_action():
    return render_template('chiefAction.html')

@app.route('/generate_hash', methods = ['POST'])
def generate_hash():
    res = request.json
    data = res['value']
    hash_obj = hashlib.sha256(data.encode())
    hash_value = hash_obj.hexdigest()
    return jsonify({'result': hash_value})

@app.route('/voteRegister', methods = ['GET'])
def register_vote():
    return render_template('voteRegister.html')

@app.route('/vote', methods = ['GET'])
def voter_login():
    return render_template('voterLogin.html')

@app.route('/vote/<string:hash>')
def vote(hash):
    return render_template('vote.html',hash = hash)

@app.route('/results')
def results():
    return render_template('results.html')





app.secret_key = '!q@w#E$r%T^y^&y77&&u*)(NitHiN))rEdDy(2154770119;'

session_manager = LightweightRedis(cleanup_interval=2)

# TTL for the session ID in seconds (2 hours)
SESSION_TTL = 2 * 60 * 60

# Dict for storing the drivers using the session id
drivers = dict()




# Before every request
@app.before_request
def generate_verify_id():
    """Middleware to handle ID generation and verification."""
    # Check if the ID exists in cookies
    session_id = request.cookies.get('session_id')
    print("Extracted Session ID before request:", session_id)
    # if not session_id or not redis_client.exists(session_id):
    if not session_id or not session_manager.get(session_id):  # Check if session_id exists in Memcached
        # Generate a new session ID if none exists or it has expired
        driver = None
        if session_id and session_id in drivers:
            driver = drivers[session_id]
        session_id = str(uuid.uuid4())
        session_manager.set(session_id, "active", SESSION_TTL)
        g.new_session = True
        if driver:
            drivers[session_id] = driver
    else:
        g.new_session = False
    # Attach session_id to the global context
    g.session_id = session_id
    print(f"Request with Session ID {session_id}")
    folder_id = request.cookies.get('folder_id')
    print("Extracted Folder ID before request:", folder_id)
    g.new_folder = False
    if not folder_id:
        folder_id = f"{session_id}_{int(time.time() * 1000)}" # added the timestamp to session_id
        g.new_folder = True
        print(f"Request with Folder ID {folder_id}")
    g.folder_id = folder_id
    # Check for folder exists or not
    parent_dir = os.path.join(os.getcwd(),'static',folder_id)
    if not os.path.exists(parent_dir):
        os.mkdir(parent_dir)
        # create the captcha folder inside that new_folder_path
        captcha_path = os.path.join(os.getcwd(), 'static', folder_id, 'captcha')
        os.mkdir(captcha_path)
        # create the download folder inside the new_folder_path
        download_path = os.path.join(os.getcwd(), 'static', folder_id, 'downloads')
        os.mkdir(download_path)
        # create the images folder inside the new_folder_path
        image_path = os.path.join(os.getcwd(), 'static', folder_id, 'images')
        os.mkdir(image_path)
        print("Folder created successfully. . . .")




# After every request
@app.after_request
def attact_ids_to_cookies(response):
    """Attach the session ID to the response cookies."""
    response = make_response(response)
    if g.new_session:
        response.set_cookie('session_id', g.session_id)
    if g.new_folder:
        response.set_cookie('folder_id', g.folder_id)
    return response




# If user cloes the tab or window
@app.route('/close_session', methods = ['POST'])
def close_session():
    """Handle session cleanup on client closure."""
    # Get the session_id and folder_id
    session_id = request.cookies.get('session_id')
    folder_id = request.cookies.get('folder_id')
    # quit and remove driver from dict
    if session_id in drivers:
        driver = drivers[session_id]
        driver.quit()
        del drivers[session_id]
    # Remove the folder
    folder_path = os.path.join(os.getcwd(), 'static', g.folder_id)
    if os.path.exists(folder_path):
        shutil.rmtree(folder_path)
        print(f"All files and subdirectories in '{folder_path}' have been removed.")
        # Check the remove the root folder directory if not deleted
        if os.path.exists(folder_path):
            os.rmdir(folder_path)
            print(f"Folder, '{folder_path}' has been removed.")
    else:
        print(f"Directory '{folder_path}' does not exist.")
    # Remove the session from the sessionManager
    if session_id and session_manager.delete(session_id):
        result = jsonify({"status": "success", 'folder_id': folder_id, 'session_id': session_id, "message": "Folder delete successfully and session closed successfully."})
        print(result)
        return jsonify({"status": "success", 'session_id': session_id, "message": "Session closed successfully."})
    return jsonify({"status": "error", 'folder_id': folder_id, 'session_id': session_id, "message": "Not done as per expected"})




# Close all drivers before downing the server
def handle_exit_signal(signal, frame):
    """Handle the exit signal and print a message."""
    print("Website Stopped")
    session_manager.stop()
    if drivers:
        for session_id in list(drivers.keys()):
            drivers[session_id].quit()
            del drivers[session_id]
    # Remove all the created folders
    root_dir = os.path.join(os.getcwd(), 'static')
    all_folders = os.listdir(root_dir)
    imp_folders = {'css', 'js', 'templates'}
    for folder in all_folders:
        if folder.lower() not in imp_folders:
            folder_path = os.path.join(os.getcwd(), 'static', folder)
            shutil.rmtree(folder_path)
            print(f"All files and subdirectories in '{folder_path}' have been removed.")
            # Check the remove the root folder directory if not deleted
            if os.path.exists(folder_path):
                os.rmdir(folder_path)
                print(f"Folder, '{folder_path}' has been removed.")
    sys.exit(0)  # Optionally exit cleanly




@app.route('/thank_you', methods = ['GET'])
def thank_you():
    if request.method == 'GET':
        return render_template('thankyou.html')


def is_mobile():
    user_agent = request.headers.get('User-Agent', '').lower()
    mobile_keywords = ["mobile", "android", "iphone", "ipad", "ipod", "windows phone"]
    
    return any(keyword in user_agent for keyword in mobile_keywords)



def detect_faces_with_mtcnn(img):
    detector = MTCNN()
    faces = detector.detect_faces(img)
    if len(faces) == 0:
        print("No faces detected.")
        return None
    x, y, w, h = faces[0]['box']
    cropped_face = img[y:y+h, x:x+w]
    return cropped_face

# Function to detect faces using RetinaFace
def detect_faces_with_retinaface(img):
    faces = RetinaFace.detect_faces(img)
    if len(faces) == 0:
        print("No faces detected.")
        return None
    key = list(faces.keys())[0]
    x, y, w, h = faces[key]['facial_area']
    cropped_face = img[y:y+h, x:x+w]
    return cropped_face

def preprocess_desk_image(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    normalized = cv2.equalizeHist(gray)
    return normalized

# Function to preprocess image (resize and convert to RGB)
def preprocess_image(image):
    image = cv2.resize(image, (160, 160))  # Standard size for FaceNet/ArcFace
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)  # Convert to RGB
    return image




def match_faces(photo_img, live_img, desk):
    photo_image = cv2.imread(photo_img)
    if desk:
        photo_face = detect_faces_with_mtcnn(photo_image)
        live_face = detect_faces_with_mtcnn(live_img)
    else:
        photo_face = detect_faces_with_retinaface(photo_image)
        live_face = detect_faces_with_retinaface(live_img)
    if photo_face is None or live_face is None:
        print("Face detection failed in one of the images.")
        return None,None
    os.path.join(os.getcwd(), "static", g.folder_id, "images")
    cv2.imwrite(f"static/photo_face.jpg", photo_face)
    cv2.imwrite("static/live_face.jpg", live_face)
    print("Face Crop Done successfully . . . . ")
    if desk:
        result = DeepFace.verify(img1_path="static/photo_face.jpg", img2_path="static/live_face.jpg", enforce_detection=False)
    else:
        # Compare images using DeepFace.verify()
        result = DeepFace.verify(
            img1_path="static/photo_face.jpg",
            img2_path="static/live_face.jpg",
            model_name="ArcFace",
            detector_backend="retinaface",
            enforce_detection=False
        )
    match_score = result['distance']
    match_percentage = (1 - match_score) * 100
    is_match = result['verified']
    os.remove('static/photo_face.jpg')
    os.remove('static/live_face.jpg')
    print("Face Crop removed successfully . . . . ")
    return match_percentage, is_match




# Dummy function for face authentication
def authenticate_face(live_img, desk):
    """ Dummy function to simulate face authentication """
    # Replace this with actual face recognition logic (e.g., OpenCV, dlib, or FaceNet)
    # return True if image_array is not None else False
    # photo_image_path = 'static/img.jpg'
    # g.folder_id = "ad1c77ef-37fa-4ccb-84de-21adac29287b_1739600823917
    photo_folder_path = os.path.join(os.getcwd(), "static", g.folder_id, "images")
    print(f"Photo folder path: {photo_folder_path}")
    if not os.path.exists(photo_folder_path):
        print(f"Error: Folder does not exist at path: {photo_folder_path}")
        return False
    photo_files = os.listdir(photo_folder_path)
    if not photo_files:
        print("Error: No files found in the photo folder.")
        return False
    photo_image_path = os.path.join(photo_folder_path, photo_files[0])
    print(f"Photo image path: {photo_image_path}")
    print("Matching faces...")
    match_percentage, is_match = match_faces(photo_image_path, live_img, desk)
    if match_percentage is not None:
        print(f"Match Percentage: {match_percentage:.2f}%")
        print("Matching Status:", "Match" if is_match else "No Match")
    folder_path = os.path.join(os.getcwd(),"static",g.folder_id,"captcha")
    for file in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file)
        os.remove(file_path)
    folder_path = os.path.join(os.getcwd(),"static",g.folder_id,"downloads")
    for file in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file)
        os.remove(file_path)
    folder_path = os.path.join(os.getcwd(),"static",g.folder_id,"images")
    for file in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file)
        os.remove(file_path)
    return is_match




# Handle actual Face Authentication
@app.route('/face_auth', methods=['GET','POST'])
def verify_face():
    if request.method == 'GET':
        return render_template('face_auth_page.html')
    folder_path = os.path.join(os.getcwd(),"static",g.folder_id,"downloads")
    for file in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file)
        os.remove(file_path)
        print("Previous File Deleted Successfully")
    folder_path = os.path.join(os.getcwd(),"static",g.folder_id,"images")
    for file in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file)
        os.remove(file_path)
    try:
        data = request.get_json()
        image_data = data.get("image")

        # Decode base64 image to OpenCV format
        encoded_data = image_data.split(",")[1]  # Remove metadata
        image_bytes = base64.b64decode(encoded_data)
        np_image = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(np_image, cv2.IMREAD_COLOR)

        desk = True
        if is_mobile():
            desk = False

        # Call the face authentication function
        is_authenticated = authenticate_face(img, desk)

        return jsonify({"success": True, "message": "Face authenticated" if is_authenticated else "Authentication failed"})
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})




# Handle PDF Manipulation
@app.route('/face_verification', methods = ['POST'])
def final_verification():
    if request.method == 'POST':
        print('Getting Details . . . .')
        data = request.get_json()
        if not data:
            return jsonify({"status": "not recieved","error": "No data received"}), 400  # Return error if no data is received
        full_name = data.get('fullName')
        yob = data.get('yob')
        op = operations()
        folder_dir = os.path.join(os.getcwd(), 'static', g.folder_id)
        # Unlock the PDF
        res = op.unlock_pdf(folder_dir, full_name, yob)
        voter_id_name = request.cookies.get('voter_id_name')  # Retrieve the cookie
        voter_name_lst = voter_id_name.split()
        full_name_lst = full_name.split()
        # if voter_name_lst.sort() != full_name_lst.sort():
        #     return jsonify({'status': 'failed', 'message': 'Voter ID name and Aadhaar Name Not matching'})
        if res == 'success':
            # extract the images # Find clear and colorful human face image and remove all other
            if op.extract_images(folder_dir):
                return jsonify({'status': 'success', 'message': 'You can Proceed further'})
                # pass # Here you can go for live face capture and face match.
            else:
                return jsonify({'status': 'failed', 'message': 'No images extracted'})
        elif res == 'failed':
            return jsonify({'status': 'failed', 'message': 'Authentication Failed'})
        else:
            return jsonify({'status': 'error', 'message': 'Error from Server side'})




# Handle OTP verification
@app.route('/verify_otp', methods = ['POST'])
def verify_otp():
    if request.method == 'POST':
        folder_path = os.path.join(os.getcwd(),"static",g.folder_id,"downloads")
        for file in os.listdir(folder_path):
            file_path = os.path.join(folder_path, file)
            os.remove(file_path)
            print("Previous File Deleted Successfully")
        print("Getting OTP . . . . ")
        data = request.get_json()
        if not data:
            return jsonify({"status": "not recieved","error": "No data received"}), 400  # Return error if no data is received
        otp_value = data.get('otp')
        # Get the driver
        driver = drivers[g.session_id]
        otp_input = WebDriverWait(driver, 60).until(
            EC.presence_of_element_located((By.XPATH, "//*[name()='input' and @name='otp']"))
        )
        otp_input.clear()
        otp_input.send_keys(otp_value)
        # Click the verify button
        verify_btn = WebDriverWait(driver, 60).until(
            EC.element_to_be_clickable((By.XPATH, "(//*[name()='button' and @class='button_btn__HeAxz'])[2]"))
        )
        verify_btn.click()
        folder_id = request.cookies.get('folder_id')
        download_dir = os.path.join(os.getcwd(), 'static', folder_id, 'downloads')
        before_files = set(os.listdir(download_dir))
        t = 0
        new_files = None
        print("Waiting for the PDF to download . . . . ")
        # time.sleep(10)
        while t<120:
            time.sleep(1)
            after_files = set(os.listdir(download_dir))
            new_files = after_files - before_files
            if new_files:
                new_file = new_files.pop()
                print("File Downloaded Successfully . . . . ")
                driver.quit()
                del drivers[g.session_id]
                break
            t+=1
        else:
            print("No file detected. Download may have failed.")
            return jsonify({'status': 'not downloaded', 'message': 'File not downloaded. OTP mismatched.'})
        return jsonify({'status': 'success', 'message': 'PDF downloaded successfully'})




# Get the captcha
def get_aadhaar_captcha(driver):
    # Get Captcha
    # WebDriverWait(driver, 60).until(EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'pvc-form__captcha-box')]/following-sibling::img")))
    # Locate the div by its class name
    captcha_box = driver.find_element(By.CLASS_NAME, "pvc-form__captcha-box")
    # Find the image inside the div
    captcha_image = captcha_box.find_element(By.TAG_NAME, "img")  # Assuming the image is in an <img> tag
    src = captcha_image.get_attribute("src")
    # folder_id = request.cookies.get('folder_id')
    # Check if the CAPTCHA is a Base64 encoded image
    if src.startswith('data:application/image'):
        try:
            # Extract the Base64 part (after 'data:image/png;base64,')
            image_data = src.split('base64,')[1]
            # Add padding to the Base64 string if necessary
            # image_data += "=" * (4 - len(image_data) % 4)
            # Check if the Base64 string is valid
            if image_data:
                # Decode the Base64 image data
                image_bytes = base64.b64decode(image_data)
                # Ensure the image is saved in the 'static' folder
                image_path = os.path.join("static", g.folder_id, "captcha", "aadhaar_captcha_img.png")
                with open(image_path, 'wb') as file:
                    file.write(image_bytes)
                print(f"Captcha image saved at {image_path}")
            else:
                print("Base64 string is empty or malformed")
                return False
        except Exception as e:
            print(f"Error decoding Base64 image: {e}")
            return False
    else:
        # If the CAPTCHA image is not Base64 encoded, download it using requests
        try:
            response = requests.get(src)
            # Ensure the image is saved in the 'static' folder
            image_path = os.path.join("static", g.folder_id, "captcha", "aadhaar_captcha_img.png")
            with open(image_path, "wb") as file:
                file.write(response.content)
            print(f"Captcha image saved at {image_path}")
        except Exception as e:
            print(f"Error downloading image: {e}")
            return False
    return True




# Handle refreshing captcha
@app.route('/refresh_captcha', methods = ['POST'])
def click_refresh_button():
    if request.method == 'POST':
        # Reuse the saved Selenium WebDriver
        driver = drivers[g.session_id]
        # get the captcha refresh button
        svg_element = WebDriverWait(driver, 60).until(
            EC.element_to_be_clickable((By.XPATH, "//*[name()='svg' and @data-testid='AutorenewIcon']"))
        )
        svg_element.click()

        print("Refresh Button Clicked Successfully")
        print("Waiting for the captcha to load . . . .")
        time.sleep(5)
        print("Captcha Loaded Successfully . . . .")
        # Store the driver
        drivers[g.session_id] = driver
        if get_aadhaar_captcha(driver):
            print("\n\tStatus code sent successfully")
            return jsonify({"status": "success", "folder_id": g.folder_id})
        return jsonify({"status": "failed"})
    return jsonify({"status": "failed", "message": "Wrong request method"})




# Path to access the page
@app.route('/aadhaarVerification', methods = ['GET', 'POST'])
def aadhaar_authentication():
    if request.method == 'GET':
        # Set up the download path
        folder_id = request.cookies.get('folder_id')
        print("Extracted Folder ID:", folder_id)
        download_path = os.path.join(os.getcwd(), 'static', g.folder_id, 'downloads')
        # Configure Chrome options
        chrome_options = Options()
        prefs = {
            "download.default_directory": download_path,  # Set download directory
            "download.prompt_for_download": False,  # Disable download prompt
            "plugins.always_open_pdf_externally": True,  # Open PDFs in default app, not browser.
            "safebrowsing.enabled": True
        }
        chrome_options.add_experimental_option("prefs", prefs)
        # Set up WebDriver with Chrome options
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        # Open the website
        driver.get('https://myaadhaar.uidai.gov.in/genricDownloadAadhaar/en')  # Replace with the actual URL
        print("Waiting for the page to load . . . .")
        # Wait for the page to load
        time.sleep(5)
        print("Page Loaded . . . .")
        drivers[g.session_id] = driver
        # Get the Captcha
        get_aadhaar_captcha(driver)
        # Save the driver session for later reuse
        drivers[g.session_id] = driver
        # print(driver)
        folder_id = g.folder_id
        return render_template('aadhaarVerification.html', folder_id = folder_id)
    elif request.method == 'POST':
        print("Getting the Details . . . .")
        data = request.get_json()
        if not data:
            return jsonify({"status": "not recieved","error": "No data received"}), 400  # Return error if no data is received
        aadhaar_number = data.get('aadhaarNum')
        captcha_value = data.get('captchaVal')
        # Get the driver
        driver = drivers[g.session_id]
        aadhaar_input = WebDriverWait(driver, 60).until(
            EC.presence_of_element_located((By.XPATH, "//*[name()='input' and @name='uid']"))
        )
        aadhaar_input.clear()
        aadhaar_input.send_keys(aadhaar_number)
        captcha_input = WebDriverWait(driver, 60).until(
            EC.presence_of_element_located((By.XPATH, "//*[name()='input' and @name='captcha']"))
        )
        captcha_input.clear()
        captcha_input.send_keys(captcha_value)
        send_btn = WebDriverWait(driver, 60).until(
            EC.element_to_be_clickable((By.XPATH, "//*[name()='button' and @class='button_btn__HeAxz']"))
        )
        send_btn.click()
        drivers[g.session_id] = driver
        try:
            otp_input = WebDriverWait(driver, 60).until(
                EC.presence_of_element_located((By.XPATH, "//*[name()='input' and @name='otp']"))
            )
            response = make_response(jsonify({"status": "success", "message": "OTP sent successfully!"}))

            # Set multiple cookies
            response.set_cookie('aadhaar_number', aadhaar_number, max_age=60*60*24)  # Expires in 1 day
            return response
        except:
            return jsonify({"status": "failed", "message": "Enter Correct Values"})
    return jsonify({"status": "error", "message": "Wrong request method"})



# Extract and store the voter captcha
def get_voter_captcha(driver):
    # Wait for the captcha to load
    WebDriverWait(driver, 60).until(EC.presence_of_element_located((By.XPATH, "//p[contains(text(),'Captcha Code')]/following-sibling::img")))
    # Get the captcha
    captcha_image = driver.find_element(By.XPATH, "//p[contains(text(),'Captcha Code')]/following-sibling::img")
    src = captcha_image.get_attribute("src")
    # Decode the captcha
    # Check if the CAPTCHA is a Base64 encoded image
    if src.startswith('data:image'):
        try:
            # Extract the Base64 part (after 'data:image/png;base64,')
            image_data = src.split('base64,')[1]
            # Add padding to the Base64 string if necessary
            # image_data += "=" * (4 - len(image_data) % 4)
            # Check if the Base64 string is valid
            if image_data:
                # Decode the Base64 image data
                image_bytes = base64.b64decode(image_data)
                # Save the image to a file
                # image_path = "static/captcha_image.png"
                # Ensure the image is saved in the 'static' folder
                image_path = os.path.join("static", g.folder_id, "captcha", "voter_captcha_img.png")
                with open(image_path, 'wb') as file:
                    file.write(image_bytes)
                print(f"Captcha image saved at {image_path}")
            else:
                print("Base64 string is empty or malformed")
                return False
        except Exception as e:
            print(f"Error decoding Base64 image: {e}")
            return False
    else:
        # If the CAPTCHA image is not Base64 encoded, download it using requests
        try:
            response = requests.get(src)
            # Ensure the image is saved in the 'static' folder
            image_path = os.path.join("static", g.folder_id, "captcha", "voter_captcha_img.png")
            with open(image_path, "wb") as file:
                file.write(response.content)
            print(f"Captcha image saved at {image_path}")
        except Exception as e:
            print(f"Error downloading image: {e}")
            return False
    return True



# Setup Voter Verification
@app.route("/voterVerification", methods = ['GET', 'POST'])
def voter_verification():
    if request.method == 'GET':
        # Step 1: Set up Chrome options (for non-headless mode)
        chrome_options = Options()
        # Don't add "--headless" to make Chrome open as a normal browser window
        driver = webdriver.Chrome(service = Service(ChromeDriverManager().install()), options = chrome_options)
        # Step 2: Open the website you want to automate
        driver.get('https://electoralsearch.eci.gov.in/')  # Replace with your actual URL
        print("Waiting for the page to load . . . .")
        # Wait for the page to load
        time.sleep(5)
        print("Page Loaded . . . .")
        # Get the states
        select_element = driver.find_element(By.XPATH, "(//select)[2]")
        # Wait for all states to load
        WebDriverWait(driver, 60).until(lambda driver: len(Select(select_element).options) > 30)
        # Store them in desired way
        options = Select(select_element).options
        states = [
            (i,options[i].text) for i in range(len(options))
        ]
        # app.config['driver'] = driver
        drivers[g.session_id] = driver
        # Get the Captcha
        get_voter_captcha(driver)
        # Save the driver session for later reuse
        # app.config['driver'] = driver
        drivers[g.session_id] = driver
        folder_id = g.folder_id
        return render_template('voterID.html', states = states, folder_id = folder_id)
    elif request.method == 'POST':
        driver = drivers[g.session_id]
        # Get the details
        data = request.get_json()
        voter_id = data.get('voterID')
        state_ind = data.get('stateInd')
        captcha = data.get('captcha')

        print(voter_id, state_ind, captcha)

        # Submit the details to the web driver
        try:
            # Fill the details
            driver.find_element(By.XPATH, "//input[@id='epicID']").send_keys(voter_id)
            select_element = driver.find_element(By.XPATH, "(//select)[2]")
            WebDriverWait(driver, 60).until(lambda driver: len(Select(select_element).options) > 30)
            states = Select(select_element)
            states.select_by_index(state_ind)
            driver.find_element(By.XPATH, "//input[@name='captcha']").send_keys(captcha)
            driver.find_element(By.XPATH, "//button[text()='SEARCH']").click()
            time.sleep(10)
            # Wait for results to load
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, 'result-main'))
            )
            # Extracting the required data from the table (adjust XPath as necessary)
            cell_xpath = f"//table//tbody//tr[1]//td[3]"  # Adjust based on the actual table structure
            cell = driver.find_element(By.XPATH, cell_xpath)
            cell_data = cell.text
            # Extract the name (assuming it's the first item in the cell's text)
            full_name = cell_data.split('\n')[0]
            # Step 4: Close the browser when done
            driver.quit()
            response = make_response(jsonify({"Status": "Done"}))
            # response.set_cookie('username', 'JohnDoe')  # Setting a cookie named 'username'
            response.set_cookie('voter_id_name', full_name, max_age=60*60*24)  # Cookie expires in 1 day
            response.set_cookie('voter_id', voter_id, max_age=60*60*24)
            # return response
            print(f"Extracted Full Name for session ID {g.session_id}: {full_name}")
            return response
        except Exception as ex:
            print("Error:",str(ex))
            driver.quit()
            return jsonify({"Status": "Not Done"})



@app.route('/getVoterCaptcha', methods = ['POST'])
def refresh_captcha():
    # Reuse the saved Selenium WebDriver
    # driver = app.config.get('driver')
    driver = drivers[g.session_id]
    # get the captcha refresh button
    WebDriverWait(driver, 60).until(EC.presence_of_element_located((By.CLASS_NAME, "ml-2")))
    driver.find_element(By.CLASS_NAME, "ml-2").click()
    print("Refresh Button Clicked Successfully")
    print("Waiting for the captcha to load . . . .")
    time.sleep(5)
    print("Captcha Loaded Successfully . . . .")
    # driver = app.config.get('driver')
    if get_voter_captcha(driver):
        print("\n\tStatus code sent successfully")
        return jsonify({"success": "true", "folder_id": g.folder_id})
    else:
        return jsonify({"success": "false"})



def get_aadhaar_captcha(driver):
    # Get Captcha
    # WebDriverWait(driver, 60).until(EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'pvc-form__captcha-box')]/following-sibling::img")))
    # Locate the div by its class name
    captcha_box = driver.find_element(By.CLASS_NAME, "pvc-form__captcha-box")
    # Find the image inside the div
    captcha_image = captcha_box.find_element(By.TAG_NAME, "img")  # Assuming the image is in an <img> tag
    src = captcha_image.get_attribute("src")
    # Check if the CAPTCHA is a Base64 encoded image
    if src.startswith('data:application/image'):
        try:
            # Extract the Base64 part (after 'data:image/png;base64,')
            image_data = src.split('base64,')[1]
            # Add padding to the Base64 string if necessary
            # image_data += "=" * (4 - len(image_data) % 4)
            # Check if the Base64 string is valid
            if image_data:
                # Decode the Base64 image data
                image_bytes = base64.b64decode(image_data)
                # Ensure the image is saved in the 'static' folder
                image_path = os.path.join("static", g.folder_id, "captcha", "aadhaar_captcha_img.png")
                with open(image_path, 'wb') as file:
                    file.write(image_bytes)
                print(f"Captcha image saved at {image_path}")
            else:
                print("Base64 string is empty or malformed")
                return False
        except Exception as e:
            print(f"Error decoding Base64 image: {e}")
            return False
    else:
        # If the CAPTCHA image is not Base64 encoded, download it using requests
        try:
            response = requests.get(src)
            # Ensure the image is saved in the 'static' folder
            image_path = os.path.join("static", g.folder_id, "captcha", "aadhaar_captcha_img.png")
            with open(image_path, "wb") as file:
                file.write(response.content)
            print(f"Captcha image saved at {image_path}")
        except Exception as e:
            print(f"Error downloading image: {e}")
            return False
    return True







# Register the signal handler
signal.signal(signal.SIGINT, handle_exit_signal)  # SIGINT is sent by pressing Ctrl+C
signal.signal(signal.SIGTERM, handle_exit_signal)  # SIGTERM is another termination signal

if __name__ == '__main__':
    try:
        # app.run(host='0.0.0.0', port=5000)
        app.run(host="0.0.0.0", port=8080, ssl_context=("cert.pem", "key.pem"))
    except Exception as ex:
        print("Website Stopped")
        session_manager.stop()
        if drivers:
            for session_id in list(drivers.keys()):
                drivers[session_id].quit()
                del drivers[session_id]
        print(f"Error details: \n{ex}")
