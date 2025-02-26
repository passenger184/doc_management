from django.shortcuts import render, get_object_or_404
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.views import APIView
from .models import UploadedFile, Category, Folder
from .serializers import UploadedFileSerializer, FolderSerializer
from django.http import JsonResponse, FileResponse, Http404
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.mail import send_mail
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.mail import EmailMessage
import json

# Create your views here.
def home(request):
    return render(request, 'home.html')

def files(request):
    return render(request, 't_files.html')

def myFiles(request, folder_id=None):
    if folder_id:
        files = UploadedFile.objects.filter(folder_id=folder_id).order_by("-uploaded_at")  # Get files in the folder
        folders = Folder.objects.filter(parent_id=folder_id).order_by("-created_at")  
        # print("folder id exist", files, folders)
    else:
        files = UploadedFile.objects.filter(folder__isnull=True).order_by("-uploaded_at")  # Get root-level files
        folders = Folder.objects.filter(parent__isnull=True).order_by("-created_at")  # Get root-level folders
        # print("folder id DOESNOT exist", files, folders)
    files_exist = files.exists()
    folders_exist = folders.exists()

    return render(request, 'myFiles.html', {
        "files": files,
        "folders": folders,
        "files_exist": files_exist,
        "folders_exist": folders_exist
    })




# Document Upload (API View for handling file uploads)
class FileUploadView(APIView):
    permission_classes = []  # No authentication required

    
    def post(self, request, folder_id=None, format=None):
        # Check if a file is provided in the request
        if "file" not in request.FILES:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        file_obj = request.FILES["file"]
        file_name = file_obj.name
        file_type = file_obj.name.split(".")[-1].lower()  # Extract file extension
        file_size = file_obj.size  # File size in bytes

        # Handle Folder (Retrieve the folder to upload the file into)
        folder_id = request.data.get("folder_id")
        print(f"folder_id: {folder_id} (Type: {type(folder_id)})") 

        # Convert folder_id to None if it's invalid
        if folder_id in [None, "None", "null", ""]:
            folder_id = None

        if folder_id is not None:
            # If folder_id exists, try to fetch the folder
            folder = Folder.objects.filter(id=folder_id).first()
            if not folder:
                return Response({"error": "Invalid folder ID"}, status=status.HTTP_400_BAD_REQUEST)
            folder_name = folder.name
        else:
            # If no folder_id is provided, the file is uploaded to the root (folder = None)
            folder = None
            folder_name = "Root"

        # Check if a file with the same name already exists in the target folder (or root)
        duplicate_file = UploadedFile.objects.filter(
            name=file_name,
            file_type=file_type,
            folder=folder  # Check for duplicates in the specific folder or root (None)
        ).exists()

        if duplicate_file:
            return Response(
                {"error": f"A file named '{file_name}' already exists in this folder."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle Category (Use provided category or default to 'General')
        category_id = request.data.get("category_id")  # Expecting category ID in request
        if category_id:
            category = Category.objects.filter(id=category_id).first()
            if not category:
                return Response({"error": "Invalid category ID"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            category = Category.get_default_category()  # Default to 'General' if not provided

        # Create and save the uploaded file
        uploaded_file = UploadedFile(
            name=file_obj.name,
            file=file_obj,
            file_type=file_type,
            file_size=file_size,
            category=category,
            folder=folder  # Associate the file with the folder (None for root)
        )
        # print(uploaded_file.folder);
        uploaded_file.save()

        # Return all files in the folder sorted by latest (if a folder is provided)
        if folder:
            # If a folder is provided, get the files within that folder
            all_files = folder.files.order_by("-uploaded_at")
        else:
            # If no folder is provided, get all files (root level)
            all_files = UploadedFile.objects.filter(folder__isnull=True).order_by("-uploaded_at")

        all_files_serializer = UploadedFileSerializer(all_files, many=True)

        return Response(
            {
                "message": "File uploaded successfully",
                "folder_name": folder_name,
                "file": UploadedFileSerializer(uploaded_file).data,  # Return the uploaded file details
                "files": all_files_serializer.data,  # Return updated list of files in the folder (or root)
            },
            status=status.HTTP_201_CREATED,
        )


    # def get(self, request, format=None):
    def get(self, request, folder_id=None):
        """Return all uploaded files sorted by latest."""
        all_files = UploadedFile.objects.order_by("-uploaded_at")
        all_folders = Folder.objects.order_by("-created_at")

        # file_serializer = UploadedFileSerializer(all_files, many=True)
        # folder_serializer = FolderSerializer(all_folders, many=True)
        
        # return Response(
        #     {
        #         "files": file_serializer.data,
        #         "folders": folder_serializer.data
        #     },
        #     status=status.HTTP_200_OK
        #     )
        if folder_id:
            files = UploadedFile.objects.filter(folder_id=folder_id)  
            folders = Folder.objects.filter(parent_id=folder_id)  # Get subfolders
            # print("For Folder Id Exist",files, folders)
        else:
            files = UploadedFile.objects.filter(folder__isnull=True)  # Root-level files
            folders = Folder.objects.filter(parent__isnull=True)  # Root-level folders
            # print("For Folder Id Doesnot Exist",files, folders)
        
        file_serializer = UploadedFileSerializer(files, many=True)
        folder_serializer = FolderSerializer(folders, many=True)
        # print(file_serializer.data)

        return Response({
            "files": file_serializer.data,
            "folders": folder_serializer.data,
            "current_folder": folder_id
        })

# Fetch Categories
def get_categories(request):
    categories = Category.objects.all()
    categories_list = [{"id": category.id, "name": category.name} for category in categories]
    return JsonResponse({"categories": categories_list})


# Create a Folder
class CreateFolderView(generics.CreateAPIView):
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer

    def perform_create(self, serializer):
        folder = serializer.save()

    def create(self, request, *args, **kwargs):
        parent_id = request.data.get('parent') or self.kwargs.get('parent_id')
        name = request.data.get('name')
        parent_id = request.data.get('parent')

        # --- NEW: Check for duplicate folder in the same parent ---
        parent = Folder.objects.filter(id=parent_id).first() if parent_id else None

        duplicate_folder = Folder.objects.filter(
            name=name,
            parent=parent  # Check in the same parent (or None for root)
        ).exists()

        if duplicate_folder:
            return Response(
                {"error": f"A folder named '{name}' already exists in this location."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().create(request, *args, **kwargs)    


# Get Folder Contents
class FolderContentsView(generics.RetrieveAPIView):
    # queryset = Folder.objects.all()
    # serializer_class = FolderSerializer    

    def get(self, request, folder_id=None):
        try:
            if folder_id:
                # Fetch files and subfolders for the given folder
                files = UploadedFile.objects.filter(folder_id=folder_id).order_by("-uploaded_at")
                subfolders = Folder.objects.filter(parent_id=folder_id).order_by("-created_at")
            else:
                # Fetch root-level files and folders
                files = UploadedFile.objects.filter(folder__isnull=True).order_by("-uploaded_at")
                subfolders = Folder.objects.filter(parent__isnull=True).order_by("-created_at")

            files_serializer = UploadedFileSerializer(files, many=True)
            folders_serializer = FolderSerializer(subfolders, many=True)

            return Response({
                "files": files_serializer.data,
                "folders": folders_serializer.data,
                "current_folder": folder_id  # If None, it means root
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Download  file
def download_file(request, file_id):
    file_instance = get_object_or_404(UploadedFile, id=file_id)

    # Get the file path
    file_path = file_instance.file.path  # Correct field reference

    try:
        response = FileResponse(open(file_path, 'rb'), as_attachment=True)
        response["Content-Disposition"] = f'attachment; filename="{file_instance.name}"'
        return response
    except FileNotFoundError:
        raise Http404("File not found.")


def view_file(request, file_id):
    # Retrieve the file instance from the database
    file_instance = get_object_or_404(UploadedFile, id=file_id)
    
    # Get the file path
    file_path = file_instance.file.path  # Assuming 'file' is the FileField in the model
    
    # Open and serve the file directly to the user
    response = FileResponse(open(file_path, 'rb'))
    return response


# def send_email(request):
#     if request.method == "POST":
#         try:
#             # Parse the JSON data
#             data = json.loads(request.body)
            
#             email = data.get('email')
#             message = data.get('message')
#             file_id = data.get('file_id')

#             if not email or not message:
#                 return JsonResponse({"error": "Email and message are required."}, status=400)

#             # Send the email (modify the logic as per your needs)
#             send_mail(
#                 'Subject - Your transfer',  # The email subject
#                  message,  # The message body
#                 'passengerlunar@gmail.com',  # From email
#                  [email],  # To email
#                  fail_silently=False,
#             )

#             return JsonResponse({"message": "Email sent successfully!"}, status=200)

#         except Exception as e:
#             return JsonResponse({"error": str(e)}, status=400)

#     return JsonResponse({"error": "Invalid request method."}, status=400)
                                                  
                                                    
# class Sendmail(APIView):
#     def post(self, request):

#         data = json.loads(request.body)
#         email = data.get('email')
#         message = data.get('message')
#         # file_id = data.get('file_id')


#         # email = request.data['d']
#         emailw = EmailMessage(
#             'Test email Subject',
#             'Test emal body, this msg is from python', 
#             settings.EMAIL_HOST_USER, 
#             [email]
#         )

#         # emailw.attach_file('')
#         emailw.send(fail_silently=False)
#         return Response({'status': True, 'message': 'Email Sent Successfully' })


class Sendmail(APIView):
    def post(self, request):
        try:
            data = json.loads(request.body)
            email = data.get('email')
            message = data.get('message')
            file_id = data.get('fileId')  # Make sure this matches the frontend

            if not email or not message:
                return Response({'error': 'Email and message are required'}, status=400)

            # Send the email
            emailw = EmailMessage(
                'Test Email Subject',
                message,  # The message from the frontend
                settings.EMAIL_HOST_USER,
                [email]
            )

            emailw.send(fail_silently=False)

            return Response({'success': True, 'message': 'Email Sent Successfully'}, status=200)

        except Exception as e:
            return Response({'error': f'An error occurred: {str(e)}'}, status=500)

        