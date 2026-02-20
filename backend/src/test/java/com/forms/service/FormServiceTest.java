package com.forms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.forms.dto.FormRequest;
import com.forms.dto.FormResponse;
import com.forms.entity.Form;
import com.forms.repository.FileMetadataRepository;
import com.forms.repository.FormRepository;
import com.forms.repository.QuestionRepository;
import com.forms.repository.ResponseRepository;
import com.forms.repository.SectionRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FormServiceTest {

    @Mock
    private FormRepository formRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private SectionRepository sectionRepository;

    @Mock
    private ResponseRepository responseRepository;

    @Mock
    private FileMetadataRepository fileMetadataRepository;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private EntityManager entityManager;

    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private FormService formService;

    private Form form;
    private FormRequest formRequest;

    @BeforeEach
    void setUp() {
        form = Form.builder()
                .id(1L)
                .title("테스트 설문")
                .description("설문 설명")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        formRequest = new FormRequest();
        formRequest.setTitle("테스트 설문");
        formRequest.setDescription("설문 설명");
    }

    @Test
    @DisplayName("폼 생성 성공")
    void createForm_Success() {
        given(formRepository.save(any(Form.class))).willReturn(form);
        given(formRepository.findById(1L)).willReturn(Optional.of(form));
        given(questionRepository.findByFormIdAndSectionIsNullOrderByOrderIndex(1L)).willReturn(Collections.emptyList());

        FormResponse result = formService.createForm(formRequest);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("테스트 설문");
        assertThat(result.getDescription()).isEqualTo("설문 설명");
        verify(formRepository).save(any(Form.class));
    }

    @Test
    @DisplayName("ID로 폼 조회 성공")
    void getFormById_Success() {
        given(formRepository.findById(1L)).willReturn(Optional.of(form));
        given(questionRepository.findByFormIdAndSectionIsNullOrderByOrderIndex(1L)).willReturn(Collections.emptyList());

        FormResponse result = formService.getFormById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getTitle()).isEqualTo("테스트 설문");
    }

    @Test
    @DisplayName("존재하지 않는 폼 조회시 예외 발생")
    void getFormById_NotFound() {
        given(formRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> formService.getFormById(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Form not found");
    }

    @Test
    @DisplayName("전체 폼 목록 조회")
    void getAllForms_Success() {
        Form form2 = Form.builder()
                .id(2L)
                .title("두번째 설문")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        given(formRepository.findAll()).willReturn(Arrays.asList(form, form2));

        List<FormResponse> result = formService.getAllForms();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getTitle()).isEqualTo("테스트 설문");
        assertThat(result.get(1).getTitle()).isEqualTo("두번째 설문");
    }

    @Test
    @DisplayName("폼 수정 성공")
    void updateForm_Success() {
        FormRequest updateRequest = new FormRequest();
        updateRequest.setTitle("수정된 제목");
        updateRequest.setDescription("수정된 설명");

        Form updatedForm = Form.builder()
                .id(1L)
                .title("수정된 제목")
                .description("수정된 설명")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        given(formRepository.existsById(1L)).willReturn(true);
        given(formRepository.findById(1L)).willReturn(Optional.of(updatedForm));
        given(questionRepository.findByFormIdAndSectionIsNullOrderByOrderIndex(1L)).willReturn(Collections.emptyList());

        FormResponse result = formService.updateForm(1L, updateRequest);

        assertThat(result.getTitle()).isEqualTo("수정된 제목");
        assertThat(result.getDescription()).isEqualTo("수정된 설명");
    }

    @Test
    @DisplayName("존재하지 않는 폼 수정시 예외 발생")
    void updateForm_NotFound() {
        given(formRepository.existsById(999L)).willReturn(false);

        assertThatThrownBy(() -> formService.updateForm(999L, formRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Form not found");
    }

    @Test
    @DisplayName("폼 삭제 성공")
    void deleteForm_Success() {
        given(formRepository.existsById(1L)).willReturn(true);
        given(questionRepository.findByFormIdWithAttachment(1L)).willReturn(Collections.emptyList());
        given(responseRepository.findByFormId(1L)).willReturn(Collections.emptyList());

        formService.deleteForm(1L);

        verify(formRepository).deleteById(1L);
    }

    @Test
    @DisplayName("존재하지 않는 폼 삭제시 예외 발생")
    void deleteForm_NotFound() {
        given(formRepository.existsById(999L)).willReturn(false);

        assertThatThrownBy(() -> formService.deleteForm(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Form not found");
    }
}
