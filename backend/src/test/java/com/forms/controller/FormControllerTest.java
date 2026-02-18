package com.forms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.forms.dto.FormRequest;
import com.forms.dto.FormResponse;
import com.forms.dto.QuestionRequest;
import com.forms.dto.QuestionResponse;
import com.forms.exception.GlobalExceptionHandler;
import com.forms.service.FormService;
import com.forms.service.QuestionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FormController.class)
@Import(GlobalExceptionHandler.class)
class FormControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private FormService formService;

    @MockBean
    private QuestionService questionService;

    private FormResponse formResponse;
    private FormRequest formRequest;

    @BeforeEach
    void setUp() {
        formResponse = FormResponse.builder()
                .id(1L)
                .title("테스트 설문")
                .description("설명")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        formRequest = new FormRequest();
        formRequest.setTitle("테스트 설문");
        formRequest.setDescription("설명");
    }

    @Test
    @DisplayName("POST /api/forms - 폼 생성 성공")
    void createForm_Success() throws Exception {
        given(formService.createForm(any(FormRequest.class))).willReturn(formResponse);

        mockMvc.perform(post("/api/forms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(formRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("테스트 설문"));
    }

    @Test
    @DisplayName("GET /api/forms/{id} - 폼 조회 성공")
    void getForm_Success() throws Exception {
        given(formService.getFormById(1L)).willReturn(formResponse);

        mockMvc.perform(get("/api/forms/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("테스트 설문"));
    }

    @Test
    @DisplayName("GET /api/forms/{id} - 존재하지 않는 폼 조회시 404 에러")
    void getForm_NotFound() throws Exception {
        given(formService.getFormById(999L)).willThrow(new IllegalArgumentException("Form not found"));

        mockMvc.perform(get("/api/forms/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/forms - 전체 폼 목록 조회")
    void getAllForms_Success() throws Exception {
        FormResponse form2 = FormResponse.builder()
                .id(2L)
                .title("두번째 설문")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        given(formService.getAllForms()).willReturn(Arrays.asList(formResponse, form2));

        mockMvc.perform(get("/api/forms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("테스트 설문"))
                .andExpect(jsonPath("$[1].title").value("두번째 설문"));
    }

    @Test
    @DisplayName("PUT /api/forms/{id} - 폼 수정 성공")
    void updateForm_Success() throws Exception {
        FormRequest updateRequest = new FormRequest();
        updateRequest.setTitle("수정된 제목");
        updateRequest.setDescription("수정된 설명");

        FormResponse updatedResponse = FormResponse.builder()
                .id(1L)
                .title("수정된 제목")
                .description("수정된 설명")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        given(formService.updateForm(eq(1L), any(FormRequest.class))).willReturn(updatedResponse);

        mockMvc.perform(put("/api/forms/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("수정된 제목"));
    }

    @Test
    @DisplayName("DELETE /api/forms/{id} - 폼 삭제 성공")
    void deleteForm_Success() throws Exception {
        doNothing().when(formService).deleteForm(1L);

        mockMvc.perform(delete("/api/forms/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("POST /api/forms/{formId}/questions - 질문 추가 성공")
    void addQuestion_Success() throws Exception {
        QuestionRequest questionRequest = new QuestionRequest();
        questionRequest.setType("SHORT_TEXT");
        questionRequest.setTitle("이름");
        questionRequest.setRequired(true);

        QuestionResponse questionResponse = QuestionResponse.builder()
                .id(1L)
                .formId(1L)
                .type("SHORT_TEXT")
                .title("이름")
                .required(true)
                .orderIndex(0)
                .build();

        given(questionService.createQuestion(eq(1L), any(QuestionRequest.class))).willReturn(questionResponse);

        mockMvc.perform(post("/api/forms/1/questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(questionRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("SHORT_TEXT"))
                .andExpect(jsonPath("$.title").value("이름"));
    }

    @Test
    @DisplayName("GET /api/forms/{formId}/questions/{questionId} - 질문 조회 성공")
    void getQuestion_Success() throws Exception {
        QuestionResponse questionResponse = QuestionResponse.builder()
                .id(1L)
                .formId(1L)
                .type("SHORT_TEXT")
                .title("이름")
                .required(true)
                .orderIndex(0)
                .build();

        given(questionService.getQuestionById(1L)).willReturn(questionResponse);

        mockMvc.perform(get("/api/forms/1/questions/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("이름"));
    }

    @Test
    @DisplayName("PUT /api/forms/{formId}/questions/{questionId} - 질문 수정 성공")
    void updateQuestion_Success() throws Exception {
        QuestionRequest updateRequest = new QuestionRequest();
        updateRequest.setType("LONG_TEXT");
        updateRequest.setTitle("수정된 질문");
        updateRequest.setRequired(false);

        QuestionResponse updatedResponse = QuestionResponse.builder()
                .id(1L)
                .formId(1L)
                .type("LONG_TEXT")
                .title("수정된 질문")
                .required(false)
                .orderIndex(0)
                .build();

        given(questionService.updateQuestion(eq(1L), any(QuestionRequest.class))).willReturn(updatedResponse);

        mockMvc.perform(put("/api/forms/1/questions/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("LONG_TEXT"))
                .andExpect(jsonPath("$.title").value("수정된 질문"));
    }

    @Test
    @DisplayName("DELETE /api/forms/{formId}/questions/{questionId} - 질문 삭제 성공")
    void deleteQuestion_Success() throws Exception {
        doNothing().when(questionService).deleteQuestion(1L);

        mockMvc.perform(delete("/api/forms/1/questions/1"))
                .andExpect(status().isNoContent());
    }
}
