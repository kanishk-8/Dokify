import PyPDF2

def process_book_and_extract_text(pdf_file_path):
    """
    Extracts text from each page of the PDF.
    Yields text (UTF-8) page by page.
    """
    with open(pdf_file_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            print(f"DEBUG: Page {i} extracted text length: {len(text) if text else 0}")
            if text:
                print(f"DEBUG: Page {i} first 100 chars: {text[:100]}")
            else:
                print(f"DEBUG: Page {i} has no extractable text.")
            yield text if text else ""

def save_book(full_text: str, output_path="converted_book.txt"):
    """
    Save the full extracted text to a file.
    """
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_text)

# Example usage
if __name__ == "__main__":
    pdf_path = "example_book.pdf"
    text_chunks = list(process_book_and_extract_text(pdf_path))
    full_text = "\n".join(text_chunks)
    save_book(full_text)
    print("Text extraction completed and saved to converted_book.txt")
