package com.survey.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Slf4j
@Service
public class FileStorageService {

    @Value("${file.upload.dir:uploads}")
    private String uploadDir;

    @Value("${file.upload.max-size:10485760}")
    private long maxFileSize;

    private static final Set<String> ALLOWED_EXTENSIONS = new HashSet<>(Arrays.asList(
            "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "svg", "heic", "heif",
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip", "rar", "7z", "csv"
    ));

    private static final Set<String> ALLOWED_MIME_TYPES = new HashSet<>(Arrays.asList(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/bmp",
            "image/tiff",
            "image/svg+xml",
            "image/heic",
            "image/heif",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "application/zip",
            "application/x-rar-compressed",
            "application/x-7z-compressed",
            "application/x-zip-compressed",
            "text/csv",
            "application/octet-stream"
    ));

    public FileStorageService() {
    }

    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of " + maxFileSize + " bytes");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new IllegalArgumentException("File name is invalid");
        }

        String fileExtension = getFileExtension(originalFilename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(fileExtension)) {
            throw new IllegalArgumentException("File extension not allowed: " + fileExtension);
        }

        // MIME 타입이 null이거나 application/octet-stream인 경우 확장자로 대체 허용
        String contentType = file.getContentType();
        boolean isMimeTypeGeneric = contentType == null || contentType.isEmpty()
                || contentType.equals("application/octet-stream");
        if (!isMimeTypeGeneric && !ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Content type not allowed: " + contentType);
        }
    }

    public String saveFile(MultipartFile file) throws IOException {
        validateFile(file);

        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            log.info("Created upload directory: {}", uploadPath);
        }

        String originalFilename = file.getOriginalFilename();
        String storedFilename = generateUniqueFilename(originalFilename);
        Path filePath = uploadPath.resolve(storedFilename);

        try {
            Files.copy(file.getInputStream(), filePath);
            log.info("File saved successfully: {} -> {}", originalFilename, storedFilename);
            return storedFilename;
        } catch (IOException e) {
            log.error("Failed to save file: {}", storedFilename, e);
            throw new IOException("Failed to save file", e);
        }
    }

    public byte[] downloadFile(String storedFilename) throws IOException {
        Path filePath = Paths.get(uploadDir, storedFilename);

        if (!Files.exists(filePath)) {
            throw new IllegalArgumentException("File not found: " + storedFilename);
        }

        try {
            byte[] fileContent = Files.readAllBytes(filePath);
            log.info("File downloaded successfully: {}", storedFilename);
            return fileContent;
        } catch (IOException e) {
            log.error("Failed to download file: {}", storedFilename, e);
            throw new IOException("Failed to download file", e);
        }
    }

    public void deleteFile(String storedFilename) throws IOException {
        Path filePath = Paths.get(uploadDir, storedFilename);

        if (!Files.exists(filePath)) {
            log.warn("File not found for deletion: {}", storedFilename);
            return;
        }

        try {
            Files.delete(filePath);
            log.info("File deleted successfully: {}", storedFilename);
        } catch (IOException e) {
            log.error("Failed to delete file: {}", storedFilename, e);
            throw new IOException("Failed to delete file", e);
        }
    }

    private String generateUniqueFilename(String originalFilename) {
        String extension = getFileExtension(originalFilename);
        String nameWithoutExtension = originalFilename.substring(0, originalFilename.lastIndexOf('.'));
        String timestamp = System.currentTimeMillis() + "";
        String randomId = UUID.randomUUID().toString().substring(0, 8);
        return nameWithoutExtension + "_" + timestamp + "_" + randomId + "." + extension;
    }

    private String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex > 0) {
            return filename.substring(lastDotIndex + 1);
        }
        return "";
    }
}
