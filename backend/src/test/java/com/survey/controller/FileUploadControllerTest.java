package com.survey.controller;

import com.survey.dto.FileMetadataResponse;
import com.survey.entity.FileMetadata;
import com.survey.service.FileUploadService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class FileUploadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FileUploadService fileUploadService;

    private FileMetadataResponse testFileMetadata;

    @BeforeEach
    void setUp() {
        testFileMetadata = FileMetadataResponse.builder()
                .id(1L)
                .originalFilename("test.pdf")
                .storedFilename("test_1707551234567_a3f2b1c4.pdf")
                .fileSize(102400L)
                .contentType("application/pdf")
                .responseId(1L)
                .questionId(1L)
                .uploadedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void testUploadFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.pdf",
                "application/pdf",
                "PDF content".getBytes()
        );

        when(fileUploadService.uploadFile(1L, 1L, file))
                .thenReturn(testFileMetadata);

        mockMvc.perform(multipart("/api/responses/1/questions/1/files")
                .file(file))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.originalFilename").value("test.pdf"))
                .andExpect(jsonPath("$.fileSize").value(102400));
    }

    @Test
    void testUploadFileWithInvalidExtension() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.exe",
                "application/x-msdownload",
                "Executable content".getBytes()
        );

        when(fileUploadService.uploadFile(1L, 1L, file))
                .thenThrow(new IllegalArgumentException("File extension not allowed: exe"));

        mockMvc.perform(multipart("/api/responses/1/questions/1/files")
                .file(file))
                .andExpect(status().isNotFound());
    }

    @Test
    void testDownloadFile() throws Exception {
        byte[] fileContent = "PDF content".getBytes();

        when(fileUploadService.getFileMetadata(1L))
                .thenReturn(testFileMetadata);
        when(fileUploadService.downloadFile(1L))
                .thenReturn(fileContent);

        mockMvc.perform(get("/api/files/1"))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    assert(result.getResponse().getContentLength() == fileContent.length);
                });
    }

    @Test
    void testDownloadFileNotFound() throws Exception {
        when(fileUploadService.downloadFile(999L))
                .thenThrow(new IllegalArgumentException("File metadata not found with id: 999"));

        mockMvc.perform(get("/api/files/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testGetFileMetadata() throws Exception {
        when(fileUploadService.getFileMetadata(1L))
                .thenReturn(testFileMetadata);

        mockMvc.perform(get("/api/files/1/metadata"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.originalFilename").value("test.pdf"))
                .andExpect(jsonPath("$.contentType").value("application/pdf"));
    }

    @Test
    void testGetFilesByResponse() throws Exception {
        List<FileMetadataResponse> files = new ArrayList<>();
        files.add(testFileMetadata);

        when(fileUploadService.getFilesByResponseId(1L))
                .thenReturn(files);

        mockMvc.perform(get("/api/responses/1/files"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].originalFilename").value("test.pdf"));
    }

    @Test
    void testGetFilesByQuestion() throws Exception {
        List<FileMetadataResponse> files = new ArrayList<>();
        files.add(testFileMetadata);

        when(fileUploadService.getFilesByQuestionId(1L))
                .thenReturn(files);

        mockMvc.perform(get("/api/questions/1/files"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].originalFilename").value("test.pdf"));
    }

    @Test
    void testGetFilesByResponseAndQuestion() throws Exception {
        List<FileMetadataResponse> files = new ArrayList<>();
        files.add(testFileMetadata);

        when(fileUploadService.getFilesByResponseAndQuestion(1L, 1L))
                .thenReturn(files);

        mockMvc.perform(get("/api/responses/1/questions/1/files"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].originalFilename").value("test.pdf"));
    }

    @Test
    void testDeleteFile() throws Exception {
        doNothing().when(fileUploadService).deleteFile(1L);

        mockMvc.perform(delete("/api/files/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void testDeleteFileNotFound() throws Exception {
        doThrow(new IllegalArgumentException("File metadata not found with id: 999"))
                .when(fileUploadService).deleteFile(999L);

        mockMvc.perform(delete("/api/files/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testUploadFileWithResponseNotFound() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.pdf",
                "application/pdf",
                "PDF content".getBytes()
        );

        when(fileUploadService.uploadFile(999L, 1L, file))
                .thenThrow(new IllegalArgumentException("Response not found with id: 999"));

        mockMvc.perform(multipart("/api/responses/999/questions/1/files")
                .file(file))
                .andExpect(status().isNotFound());
    }

    @Test
    void testUploadFileWithQuestionNotFound() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.pdf",
                "application/pdf",
                "PDF content".getBytes()
        );

        when(fileUploadService.uploadFile(1L, 999L, file))
                .thenThrow(new IllegalArgumentException("Question not found with id: 999"));

        mockMvc.perform(multipart("/api/responses/1/questions/999/files")
                .file(file))
                .andExpect(status().isNotFound());
    }
}
