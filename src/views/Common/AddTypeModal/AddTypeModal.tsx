import React from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

interface IProps {
    showModal: boolean,
    item: string,
    add: (name: string) => void
    closeModal: () => void
}

const AddTypeModal: React.FC<IProps> = ({showModal, item, add, closeModal}) => {

    let itemRef: any = undefined;
    let name: string = '';
    
    switch (item) {
        case ('documentTypes'): {
            name = 'Document Type';
            break;
        }
        case ('landmarks'): {
            name = 'Landmark';
        }
    }

    return (
        <Modal
            size="lg"
            aria-labelledby="contained-modal-title-vcenter"
            centered
            show={showModal}
            >
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                Add New {name}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="formAddDocType">
                        <Form.Label>{name}</Form.Label>
                        <Form.Control type="text" ref={(ref: any) => itemRef = ref}/>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={() => {add(itemRef.value)}}>Add</Button>
                <Button onClick={closeModal}>Cancel</Button>
            </Modal.Footer>
        </Modal>
    )
}

export default AddTypeModal;