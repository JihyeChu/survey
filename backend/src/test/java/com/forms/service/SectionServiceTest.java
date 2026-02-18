package com.forms.service;

import com.forms.dto.SectionRequest;
import com.forms.dto.SectionResponse;
import com.forms.entity.Form;
import com.forms.entity.Section;
import com.forms.repository.FormRepository;
import com.forms.repository.SectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SectionServiceTest {

    @Mock
    private SectionRepository sectionRepository;

    @Mock
    private FormRepository formRepository;

    @InjectMocks
    private SectionService sectionService;

    private Form form;
    private Section section;
    private SectionRequest sectionRequest;

    @BeforeEach
    void setUp() {
        form = Form.builder()
                .id(1L)
                .title("테스트 설문")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        section = Section.builder()
                .id(1L)
                .form(form)
                .title("섹션 1")
                .description("섹션 설명")
                .orderIndex(0)
                .questions(new ArrayList<>())
                .build();

        sectionRequest = new SectionRequest();
        sectionRequest.setTitle("섹션 1");
        sectionRequest.setDescription("섹션 설명");
        sectionRequest.setOrderIndex(0);
    }

    @Test
    @DisplayName("섹션 생성 성공")
    void createSection_Success() {
        given(formRepository.findById(1L)).willReturn(Optional.of(form));
        given(sectionRepository.save(any(Section.class))).willReturn(section);

        SectionResponse result = sectionService.createSection(1L, sectionRequest);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("섹션 1");
        assertThat(result.getDescription()).isEqualTo("섹션 설명");
        assertThat(result.getOrderIndex()).isEqualTo(0);
        verify(sectionRepository).save(any(Section.class));
    }

    @Test
    @DisplayName("존재하지 않는 폼에 섹션 생성시 예외 발생")
    void createSection_FormNotFound() {
        given(formRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> sectionService.createSection(999L, sectionRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Form not found");
    }

    @Test
    @DisplayName("ID로 섹션 조회 성공")
    void getSectionById_Success() {
        given(sectionRepository.findById(1L)).willReturn(Optional.of(section));

        SectionResponse result = sectionService.getSectionById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getTitle()).isEqualTo("섹션 1");
        assertThat(result.getDescription()).isEqualTo("섹션 설명");
    }

    @Test
    @DisplayName("존재하지 않는 섹션 조회시 예외 발생")
    void getSectionById_NotFound() {
        given(sectionRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> sectionService.getSectionById(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Section not found");
    }

    @Test
    @DisplayName("폼 ID로 섹션 목록 조회 성공")
    void getSectionsByFormId_Success() {
        Section section2 = Section.builder()
                .id(2L)
                .form(form)
                .title("섹션 2")
                .description("섹션 2 설명")
                .orderIndex(1)
                .questions(new ArrayList<>())
                .build();

        given(formRepository.existsById(1L)).willReturn(true);
        given(sectionRepository.findByFormId(1L)).willReturn(Arrays.asList(section, section2));

        List<SectionResponse> result = sectionService.getSectionsByFormId(1L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getTitle()).isEqualTo("섹션 1");
        assertThat(result.get(1).getTitle()).isEqualTo("섹션 2");
    }

    @Test
    @DisplayName("폼 ID로 섹션 목록 조회 - 빈 목록")
    void getSectionsByFormId_Empty() {
        given(formRepository.existsById(1L)).willReturn(true);
        given(sectionRepository.findByFormId(1L)).willReturn(Collections.emptyList());

        List<SectionResponse> result = sectionService.getSectionsByFormId(1L);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 폼의 섹션 목록 조회시 예외 발생")
    void getSectionsByFormId_FormNotFound() {
        given(formRepository.existsById(999L)).willReturn(false);

        assertThatThrownBy(() -> sectionService.getSectionsByFormId(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Form not found");
    }

    @Test
    @DisplayName("섹션 수정 성공")
    void updateSection_Success() {
        SectionRequest updateRequest = new SectionRequest();
        updateRequest.setTitle("수정된 섹션");
        updateRequest.setDescription("수정된 설명");
        updateRequest.setOrderIndex(2);

        Section updatedSection = Section.builder()
                .id(1L)
                .form(form)
                .title("수정된 섹션")
                .description("수정된 설명")
                .orderIndex(2)
                .questions(new ArrayList<>())
                .build();

        given(sectionRepository.findById(1L)).willReturn(Optional.of(section));
        given(sectionRepository.save(any(Section.class))).willReturn(updatedSection);

        SectionResponse result = sectionService.updateSection(1L, updateRequest);

        assertThat(result.getTitle()).isEqualTo("수정된 섹션");
        assertThat(result.getDescription()).isEqualTo("수정된 설명");
        assertThat(result.getOrderIndex()).isEqualTo(2);
    }

    @Test
    @DisplayName("존재하지 않는 섹션 수정시 예외 발생")
    void updateSection_NotFound() {
        given(sectionRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> sectionService.updateSection(999L, sectionRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Section not found");
    }

    @Test
    @DisplayName("섹션 삭제 성공")
    void deleteSection_Success() {
        given(sectionRepository.existsById(1L)).willReturn(true);

        sectionService.deleteSection(1L);

        verify(sectionRepository).deleteById(1L);
    }

    @Test
    @DisplayName("존재하지 않는 섹션 삭제시 예외 발생")
    void deleteSection_NotFound() {
        given(sectionRepository.existsById(999L)).willReturn(false);

        assertThatThrownBy(() -> sectionService.deleteSection(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Section not found");
    }
}
