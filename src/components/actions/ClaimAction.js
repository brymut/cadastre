import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
const GeoWebCoordinate = require("js-geo-web-coordinate");

function ClaimAction({ claimBase1Coord, claimBase2Coord }) {
  function _claim() {
    let baseCoord = GeoWebCoordinate.make_gw_coord(
      claimBase1Coord.x,
      claimBase1Coord.y
    );
    let destCoord = GeoWebCoordinate.make_gw_coord(
      claimBase2Coord.x,
      claimBase2Coord.y
    );
    let path = GeoWebCoordinate.make_rect_path(baseCoord, destCoord);

    console.log(baseCoord.toString(16), path);
  }

  return (
    <Card border="secondary" className="bg-dark mt-5">
      <Card.Body>
        <Card.Title className="text-primary">Claim</Card.Title>
        <Card.Text>
          <Form>
            <Form.Group>
              <Form.Control
                className="bg-dark text-light"
                type="text"
                placeholder="New For Sale Price (DAI)"
              />
              <br />
              <Form.Control
                className="bg-dark text-light"
                type="text"
                placeholder="Network Fee Payment (DAI)"
              />
            </Form.Group>
          </Form>
          <p>New Expiration Date:</p>
          <p>Total (excluding gas):</p>
          <Button variant="primary" className="w-100" onClick={_claim}>
            Confirm
          </Button>
        </Card.Text>
      </Card.Body>
      <Card.Footer border="secondary">
        You will need to confirm x Metamask transactions to complete the
        transfer.
      </Card.Footer>
    </Card>
  );
}

export default ClaimAction;
